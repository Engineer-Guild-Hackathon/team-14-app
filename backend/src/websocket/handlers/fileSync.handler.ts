import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { verifyCode as verifyCodeService } from '../../services/verification.service';

interface FileChange {
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
}

interface CodeUpdateData {
  projectId: string;
  changes: FileChange[];
}

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function handleFileSync(
  socket: AuthenticatedSocket,
  data: CodeUpdateData,
  io: SocketIOServer
): Promise<void> {
  try {
    const userId = socket.user!.id;
    
    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        userId
      }
    });

    if (!project) {
      socket.emit('error', { message: 'Project not found or access denied' });
      return;
    }

    // Process each file change
    for (const change of data.changes) {
      await processFileChange(userId, data.projectId, change, socket, io);
    }

    logger.info(`File sync completed for project ${data.projectId}: ${data.changes.length} changes processed`);

  } catch (error) {
    logger.error('File sync error:', error);
    socket.emit('error', { 
      message: 'File synchronization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function processFileChange(
  userId: string,
  projectId: string,
  change: FileChange,
  socket: AuthenticatedSocket,
  io: SocketIOServer
): Promise<void> {
  try {
    // Only process content changes for files (not directories)
    if (change.type === 'addDir' || change.type === 'unlinkDir') {
      return;
    }

    // Save to code history if content is available
    if (change.content && isCodeFile(change.filePath)) {
      await saveCodeHistory(userId, projectId, change);
    }

    // Check for quest-related auto-verification
    if (change.questContext && change.content && change.type !== 'unlink') {
      await handleQuestAutoVerification(userId, change, socket, io);
    }

    // Broadcast file change to project members
    socket.to(`project:${projectId}`).emit('file-update', {
      userId,
      userEmail: socket.user!.email,
      projectId,
      filePath: change.filePath,
      changeType: change.type,
      hasContent: !!change.content,
      timestamp: change.timestamp,
      questContext: change.questContext
    });

  } catch (error) {
    logger.error(`Error processing file change for ${change.filePath}:`, error);
  }
}

async function saveCodeHistory(
  userId: string,
  projectId: string,
  change: FileChange
): Promise<void> {
  try {
    // Get the latest code history for comparison
    const lastHistory = await prisma.codeHistory.findFirst({
      where: {
        userId,
        projectId,
        filePath: change.filePath
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Determine change type based on file operation and content
    let changeType: 'CREATE' | 'MODIFY' | 'DELETE';
    if (change.type === 'unlink') {
      changeType = 'DELETE';
    } else if (change.type === 'add' || !lastHistory) {
      changeType = 'CREATE';
    } else {
      changeType = 'MODIFY';
    }

    await prisma.codeHistory.create({
      data: {
        userId,
        projectId,
        filePath: change.filePath,
        changeType,
        afterCode: change.content || '',
        lineNumber: calculateChangedLines(lastHistory?.afterCode, change.content),
        timestamp: new Date(change.timestamp)
      }
    });

    logger.debug(`Code history saved for ${change.filePath} (${changeType})`);
  } catch (error) {
    logger.error('Failed to save code history:', error);
  }
}

async function handleQuestAutoVerification(
  userId: string,
  change: FileChange,
  socket: AuthenticatedSocket,
  io: SocketIOServer
): Promise<void> {
  try {
    const questContext = change.questContext!;
    
    // Verify quest and step exist and belong to user
    const quest = await prisma.quest.findFirst({
      where: {
        id: questContext.questId,
        userId
      },
      include: {
        steps: {
          where: { id: questContext.stepId }
        },
        project: {
          select: { id: true }
        }
      }
    });

    if (!quest || quest.steps.length === 0) {
      logger.warn(`Quest verification failed: quest ${questContext.questId} or step ${questContext.stepId} not found`);
      return;
    }

    const step = quest.steps[0];

    // Use advanced verification service
    const verificationResult = await verifyCodeService({
      stepId: questContext.stepId,
      filePath: change.filePath,
      submittedCode: change.content!,
      expectedCode: questContext.expectedCode,
      stepType: step.type
    });

    // Emit verification result
    socket.emit('auto-verification-result', {
      questId: questContext.questId,
      stepId: questContext.stepId,
      filePath: change.filePath,
      success: verificationResult.success,
      score: verificationResult.score,
      feedback: verificationResult.feedback,
      hints: verificationResult.hints,
      improvements: verificationResult.improvements,
      errors: verificationResult.errors,
      timestamp: new Date().toISOString()
    });

    // Update progress if verification successful
    if (verificationResult.success) {
      await updateStepProgress(userId, questContext.questId, questContext.stepId);
      
      // Broadcast progress to project members
      socket.to(`project:${quest.project.id}`).emit('quest-progress', {
        questId: questContext.questId,
        userId,
        userEmail: socket.user!.email,
        stepId: questContext.stepId,
        stepCompleted: true,
        score: verificationResult.score,
        autoVerified: true,
        timestamp: new Date().toISOString()
      });

      logger.info(`Auto-verification successful for user ${userId}, quest ${questContext.questId}, step ${questContext.stepId}`);
    } else {
      logger.debug(`Auto-verification failed for user ${userId}, quest ${questContext.questId}, step ${questContext.stepId}: score ${verificationResult.score}`);
    }

  } catch (error) {
    logger.error('Auto-verification error:', error);
  }
}

async function updateStepProgress(
  userId: string,
  questId: string,
  stepId: string
): Promise<void> {
  try {
    const progress = await prisma.progress.findUnique({
      where: { 
        userId_questId: { userId, questId }
      }
    });

    if (!progress) {
      throw new Error('Progress not found');
    }

    // Update step progress
    await prisma.stepProgress.upsert({
      where: {
        progressId_stepId: {
          progressId: progress.id,
          stepId
        }
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
        attempts: { increment: 1 }
      },
      create: {
        progressId: progress.id,
        stepId,
        isCompleted: true,
        completedAt: new Date(),
        attempts: 1
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
    await prisma.progress.update({
      where: { id: progress.id },
      data: {
        completedSteps: completedStepsCount,
        status: completedStepsCount === progress.totalSteps ? 'COMPLETED' : 'IN_PROGRESS',
        ...(completedStepsCount === progress.totalSteps && {
          completedAt: new Date()
        })
      }
    });

  } catch (error) {
    logger.error('Failed to update step progress:', error);
    throw error;
  }
}

function isCodeFile(filePath: string): boolean {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.py', '.rb', '.php', '.java', '.c', '.cpp', '.h',
    '.go', '.rs', '.swift', '.kt', '.scala',
    '.json', '.xml', '.yaml', '.yml'
  ];

  const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return codeExtensions.includes(extension);
}

function calculateChangedLines(beforeCode?: string | null, afterCode?: string | null): number | null {
  if (!beforeCode || !afterCode) {
    return null;
  }

  const beforeLines = beforeCode.split('\n');
  const afterLines = afterCode.split('\n');
  
  // Simple heuristic: find first different line
  for (let i = 0; i < Math.max(beforeLines.length, afterLines.length); i++) {
    if (beforeLines[i] !== afterLines[i]) {
      return i + 1; // 1-based line numbers
    }
  }
  
  return null;
}

// Utility functions for backward compatibility
export async function handleFileChange(
  socket: AuthenticatedSocket,
  data: any,
  io: SocketIOServer
): Promise<void> {
  // Convert legacy format to new format
  const codeUpdateData: CodeUpdateData = {
    projectId: data.projectId,
    changes: [{
      filePath: data.filePath,
      type: data.changeType?.toLowerCase() === 'create' ? 'add' : 
           data.changeType?.toLowerCase() === 'delete' ? 'unlink' : 'change',
      content: data.content,
      timestamp: new Date().toISOString()
    }]
  };

  await handleFileSync(socket, codeUpdateData, io);
}

export async function handleVerificationRequest(
  socket: AuthenticatedSocket,
  data: {
    questId: string;
    stepId: string;
    code: string;
    filePath: string;
  },
  io: SocketIOServer
): Promise<void> {
  try {
    const userId = socket.user!.id;

    const verificationResult = await verifyCodeService({
      stepId: data.stepId,
      filePath: data.filePath,
      submittedCode: data.code,
      stepType: 'IMPLEMENT_CODE'
    });

    socket.emit('verification-result', {
      questId: data.questId,
      stepId: data.stepId,
      success: verificationResult.success,
      score: verificationResult.score,
      feedback: verificationResult.feedback,
      hints: verificationResult.hints,
      improvements: verificationResult.improvements,
      errors: verificationResult.errors,
      timestamp: new Date().toISOString()
    });

    if (verificationResult.success) {
      await updateStepProgress(userId, data.questId, data.stepId);
    }

  } catch (error) {
    logger.error('Verification request error:', error);
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
}

export async function broadcastToProject(
  io: SocketIOServer,
  projectId: string,
  event: string,
  data: any,
  excludeSocketId?: string
): Promise<void> {
  const room = io.to(`project:${projectId}`);
  
  if (excludeSocketId) {
    room.except(excludeSocketId).emit(event, data);
  } else {
    room.emit(event, data);
  }
  
  logger.debug(`Broadcasted '${event}' to project ${projectId}`);
}