import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { handleFileSync } from './handlers/fileSync.handler';
import { verifyCode as verifyCodeService } from '../services/verification.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class SocketManager {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map();
  private projectRooms: Map<string, Set<string>> = new Map();
  private socketUsers: Map<string, string> = new Map();

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL || "http://localhost:3001",
          process.env.PC_CLIENT_URL || "http://localhost:3000",
          "chrome-extension://" + (process.env.CHROME_EXTENSION_ID || "*")
        ],
        credentials: true,
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        });

        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.user!.id;
      this.userSockets.set(userId, socket.id);

      logger.info(`User connected: ${socket.user!.email} (${socket.id})`);

      socket.on('join-project', async (data: { projectId: string, userId: string }) => {
        try {
          const project = await prisma.project.findFirst({
            where: {
              id: data.projectId,
              userId: data.userId || userId
            }
          });

          if (project) {
            socket.join(`project:${data.projectId}`);
            
            // Track project room membership
            if (!this.projectRooms.has(data.projectId)) {
              this.projectRooms.set(data.projectId, new Set());
            }
            this.projectRooms.get(data.projectId)!.add(userId);
            
            socket.emit('project-joined', { 
              projectId: data.projectId,
              timestamp: new Date().toISOString()
            });
            
            // Notify other project members
            socket.to(`project:${data.projectId}`).emit('user-joined', {
              userId,
              projectId: data.projectId,
              userEmail: socket.user!.email,
              timestamp: new Date().toISOString()
            });
            
            logger.info(`User ${userId} joined project: ${data.projectId}`);
          } else {
            socket.emit('error', { message: 'Project not found or access denied' });
          }
        } catch (error) {
          logger.error('Join project error:', error);
          socket.emit('error', { message: 'Failed to join project' });
        }
      });

      socket.on('leave-project', (data: { projectId: string }) => {
        socket.leave(`project:${data.projectId}`);
        
        // Remove from project room tracking
        if (this.projectRooms.has(data.projectId)) {
          this.projectRooms.get(data.projectId)!.delete(userId);
          if (this.projectRooms.get(data.projectId)!.size === 0) {
            this.projectRooms.delete(data.projectId);
          }
        }
        
        socket.emit('project-left', { 
          projectId: data.projectId,
          timestamp: new Date().toISOString()
        });
        
        // Notify other project members
        socket.to(`project:${data.projectId}`).emit('user-left', {
          userId,
          projectId: data.projectId,
          userEmail: socket.user!.email,
          timestamp: new Date().toISOString()
        });
        
        logger.info(`User ${userId} left project: ${data.projectId}`);
      });

      socket.on('code-update', async (data: {
        projectId: string;
        changes: Array<{
          filePath: string;
          type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
          content?: string;
          diff?: string;
          timestamp: string;
          questContext?: {
            questId: string;
            stepId: string;
            expectedCode?: string;
          };
        }>;
      }) => {
        try {
          await handleFileSync(socket, data, this.io);
          
          // Broadcast file changes to other project members
          socket.to(`project:${data.projectId}`).emit('file-update', {
            userId,
            projectId: data.projectId,
            changes: data.changes,
            timestamp: new Date().toISOString()
          });
          
          logger.info(`File changes from user ${userId} in project ${data.projectId}: ${data.changes.length} files`);
        } catch (error) {
          logger.error('File sync error:', error);
          socket.emit('error', { message: 'Failed to sync file changes' });
        }
      });

      socket.on('request-verification', async (data: {
        projectId: string;
        questId: string;
        stepId: string;
        filePath: string;
        submittedCode: string;
        expectedCode?: string;
        stepType: 'ARRANGE_CODE' | 'IMPLEMENT_CODE' | 'VERIFY_OUTPUT';
      }) => {
        try {
          const verification = await verifyCodeService({
            stepId: data.stepId,
            filePath: data.filePath,
            submittedCode: data.submittedCode,
            expectedCode: data.expectedCode,
            stepType: data.stepType
          });
          
          // Update progress if verification is successful
          if (verification.success) {
            await this.updateQuestProgress(userId, data.questId, data.stepId);
          }
          
          socket.emit('verification-result', {
            questId: data.questId,
            stepId: data.stepId,
            success: verification.success,
            score: verification.score,
            feedback: verification.feedback,
            hints: verification.hints,
            improvements: verification.improvements,
            errors: verification.errors,
            timestamp: new Date().toISOString()
          });

          // Broadcast progress update to project members
          if (verification.success) {
            socket.to(`project:${data.projectId}`).emit('quest-progress', {
              questId: data.questId,
              userId,
              userEmail: socket.user!.email,
              stepId: data.stepId,
              stepCompleted: true,
              score: verification.score,
              timestamp: new Date().toISOString()
            });
          }
          
          logger.info(`Code verification for user ${userId}, quest ${data.questId}, step ${data.stepId}: ${verification.success ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          logger.error('Code verification error:', error);
          socket.emit('verification-result', {
            questId: data.questId,
            stepId: data.stepId,
            success: false,
            score: 0,
            feedback: 'コード検証中にエラーが発生しました',
            hints: ['再度お試しください'],
            improvements: [],
            errors: [{
              type: 'syntax',
              message: 'システムエラーが発生しました'
            }],
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on('disconnect', () => {
        this.userSockets.delete(userId);
        this.socketUsers.delete(socket.id);
        
        // Remove from all project rooms
        for (const [projectId, userSet] of this.projectRooms.entries()) {
          if (userSet.has(userId)) {
            userSet.delete(userId);
            socket.to(`project:${projectId}`).emit('user-left', {
              userId,
              projectId,
              userEmail: socket.user!.email,
              timestamp: new Date().toISOString()
            });
            
            if (userSet.size === 0) {
              this.projectRooms.delete(projectId);
            }
          }
        }
        
        logger.info(`User disconnected: ${socket.user!.email} (${socket.id})`);
      });
    });
  }

  private async updateQuestProgress(userId: string, questId: string, stepId: string): Promise<void> {
    try {
      const progress = await prisma.progress.findUnique({
        where: { 
          userId_questId: { userId, questId }
        },
        include: {
          quest: {
            select: {
              id: true,
              projectId: true
            }
          }
        }
      });

      if (!progress) {
        throw new Error('Progress not found');
      }

      // Update step progress
      await prisma.stepProgress.update({
        where: {
          progressId_stepId: {
            progressId: progress.id,
            stepId
          }
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          attempts: { increment: 1 }
        }
      });

      // Count completed steps
      const completedStepsCount = await prisma.stepProgress.count({
        where: {
          progressId: progress.id,
          isCompleted: true
        }
      });

      // Update overall progress
      const updatedProgress = await prisma.progress.update({
        where: { id: progress.id },
        data: {
          completedSteps: completedStepsCount,
          status: completedStepsCount === progress.totalSteps ? 'COMPLETED' : 'IN_PROGRESS',
          ...(completedStepsCount === progress.totalSteps && {
            completedAt: new Date()
          })
        }
      });

      // Emit quest completed event if quest is fully completed
      if (updatedProgress.status === 'COMPLETED') {
        this.emitToProject(progress.quest.projectId, 'quest-completed', {
          questId,
          userId,
          completedAt: updatedProgress.completedAt,
          totalSteps: progress.totalSteps,
          timeSpent: updatedProgress.timeSpent
        });
        
        logger.info(`Quest completed: ${questId} by user ${userId}`);
      }
    } catch (error) {
      logger.error('Failed to update quest progress:', error);
      throw error;
    }
  }

  public emitToUser(userId: string, event: string, data: any): boolean {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  public emitToProject(projectId: string, event: string, data: any): void {
    this.io.to(`project:${projectId}`).emit(event, data);
    logger.debug(`Emitted '${event}' to project ${projectId}`);
  }

  public broadcastToProject(projectId: string, event: string, data: any, excludeUserId?: string): void {
    const room = this.io.to(`project:${projectId}`);
    
    if (excludeUserId) {
      const excludeSocketId = this.userSockets.get(excludeUserId);
      if (excludeSocketId) {
        room.except(excludeSocketId).emit(event, data);
      } else {
        room.emit(event, data);
      }
    } else {
      room.emit(event, data);
    }
    
    logger.debug(`Broadcasted '${event}' to project ${projectId}`);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  public getProjectMembers(projectId: string): string[] {
    return Array.from(this.projectRooms.get(projectId) || []);
  }

  public isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  public getConnectionStats(): {
    totalConnections: number;
    activeProjects: number;
    projectDistribution: Record<string, number>;
  } {
    const projectDistribution: Record<string, number> = {};
    
    for (const [projectId, userSet] of this.projectRooms.entries()) {
      projectDistribution[projectId] = userSet.size;
    }
    
    return {
      totalConnections: this.userSockets.size,
      activeProjects: this.projectRooms.size,
      projectDistribution
    };
  }

  public async emitProgressUpdate(questId: string, userId: string): Promise<void> {
    try {
      const progress = await prisma.progress.findUnique({
        where: {
          userId_questId: { userId, questId }
        },
        include: {
          quest: {
            select: {
              projectId: true,
              title: true
            }
          },
          stepProgress: {
            include: {
              step: {
                select: {
                  id: true,
                  stepNumber: true,
                  title: true
                }
              }
            }
          }
        }
      });

      if (progress) {
        this.emitToProject(progress.quest.projectId, 'quest-progress-update', {
          questId,
          userId,
          progress: {
            completedSteps: progress.completedSteps,
            totalSteps: progress.totalSteps,
            status: progress.status,
            timeSpent: progress.timeSpent,
            startedAt: progress.startedAt,
            completedAt: progress.completedAt
          },
          questTitle: progress.quest.title,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Failed to emit progress update:', error);
    }
  }
}