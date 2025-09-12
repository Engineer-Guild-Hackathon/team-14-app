import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';
import { ConfigStore } from '../store/config';

export interface FileChange {
  filePath: string;
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  content?: string;
  timestamp: string;
  stats?: {
    size: number;
    mtime: Date;
  };
  diff?: string;
  questContext?: {
    questId: string;
    stepId: string;
    expectedCode?: string;
  };
}

export interface ProjectWatchConfig {
  projectId: string;
  projectPath: string;
  userId: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  activeQuest?: {
    questId: string;
    currentStep: number;
    stepId: string;
    expectedCode?: string;
  };
}

export interface VerificationRequest {
  stepId: string;
  filePath: string;
  submittedCode: string;
  expectedCode?: string;
  stepType: 'ARRANGE_CODE' | 'IMPLEMENT_CODE' | 'VERIFY_OUTPUT';
}

export interface VerificationResult {
  success: boolean;
  score: number;
  feedback: string;
  hints: string[];
  improvements: string[];
  errors: Array<{
    type: 'syntax' | 'logic' | 'style' | 'missing';
    line?: number;
    message: string;
    suggestion?: string;
  }>;
}

export type FileChangeCallback = (changes: FileChange[]) => void;

export class FileWatcher {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private watchedProjects: Map<string, ProjectWatchConfig> = new Map();
  private callback: FileChangeCallback;
  private changeBuffer: Map<string, FileChange[]> = new Map();
  private flushTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly FLUSH_DELAY = 500; // ms
  private socket: Socket | null = null;
  private config: ConfigStore;
  private apiBaseUrl: string;
  private authToken: string | null = null;
  private git: Map<string, ReturnType<typeof simpleGit>> = new Map();

  constructor(callback: FileChangeCallback) {
    this.callback = callback;
    this.config = new ConfigStore();
    this.apiBaseUrl = this.config.get('apiBaseUrl') || 'http://localhost:3000';
    this.authToken = this.config.get('authToken') || null;
    this.initializeWebSocket();
  }

  public async startWatchingProject(config: ProjectWatchConfig): Promise<void> {
    try {
      // Stop existing watcher for this project if any
      await this.stopWatchingProject(config.projectId);

      const watcher = chokidar.watch(config.projectPath, {
        ignored: [
          /(^|[\/\\])\../,  // dot files
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
          '**/.git/**',
          '**/.DS_Store',
          '**/Thumbs.db',
          '**/*.tmp',
          '**/*.temp',
          '**/*.log'
        ],
        persistent: true,
        ignoreInitial: true,
        followSymlinks: false,
        depth: 10,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 50
        }
      });

      this.watchers.set(config.projectId, watcher);
      this.watchedProjects.set(config.projectId, config);
      this.git.set(config.projectId, simpleGit(config.projectPath));
      this.changeBuffer.set(config.projectId, []);

      this.setupProjectEventHandlers(config.projectId, watcher);
      
      // Join WebSocket room for this project
      if (this.socket) {
        this.socket.emit('join-project', {
          projectId: config.projectId,
          userId: config.userId
        });
      }

      logger.info(`File watcher started for project: ${config.projectId} at ${config.projectPath}`);
    } catch (error) {
      logger.error(`Failed to start watching project ${config.projectId}:`, error);
      throw error;
    }
  }

  public async stopWatchingProject(projectId: string): Promise<void> {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(projectId);
    }

    const timer = this.flushTimers.get(projectId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(projectId);
    }

    this.flushProjectChanges(projectId);
    this.watchedProjects.delete(projectId);
    this.changeBuffer.delete(projectId);
    this.git.delete(projectId);

    // Leave WebSocket room
    if (this.socket) {
      this.socket.emit('leave-project', { projectId });
    }

    logger.info(`File watcher stopped for project: ${projectId}`);
  }

  public async stopAll(): Promise<void> {
    const projectIds = Array.from(this.watchers.keys());
    await Promise.all(projectIds.map(id => this.stopWatchingProject(id)));
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    logger.info('All file watchers stopped');
  }

  private setupProjectEventHandlers(projectId: string, watcher: chokidar.FSWatcher): void {
    const config = this.watchedProjects.get(projectId);
    if (!config) return;
    
    watcher.on('add', (filePath) => {
      this.handleFileEvent(filePath, 'add', projectId, config.projectPath);
    });

    watcher.on('change', (filePath) => {
      this.handleFileEvent(filePath, 'change', projectId, config.projectPath);
    });

    watcher.on('unlink', (filePath) => {
      this.handleFileEvent(filePath, 'unlink', projectId, config.projectPath);
    });

    watcher.on('addDir', (dirPath) => {
      this.handleFileEvent(dirPath, 'addDir', projectId, config.projectPath);
    });

    watcher.on('unlinkDir', (dirPath) => {
      this.handleFileEvent(dirPath, 'unlinkDir', projectId, config.projectPath);
    });

    watcher.on('error', (error) => {
      logger.error(`File watcher error for project ${projectId}:`, error);
    });
  }

  private initializeWebSocket(): void {
    if (!this.authToken) {
      logger.warn('No auth token found, WebSocket connection skipped');
      return;
    }

    this.socket = io(this.apiBaseUrl, {
      auth: {
        token: this.authToken
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      logger.info('WebSocket connected to backend');
    });

    this.socket.on('disconnect', () => {
      logger.warn('WebSocket disconnected from backend');
    });

    this.socket.on('verification-result', (data: VerificationResult & { questId: string, stepId: string }) => {
      logger.info(`Verification result received for quest ${data.questId}, step ${data.stepId}:`, {
        success: data.success,
        score: data.score
      });
      
      // Broadcast to renderer process
      this.broadcastToRenderer('verification-result', data);
    });

    this.socket.on('quest-progress', (data: { questId: string, progress: any }) => {
      logger.info(`Quest progress update: ${data.questId}`);
      this.broadcastToRenderer('quest-progress', data);
    });

    this.socket.on('quest-completed', (data: { questId: string, completedAt: string }) => {
      logger.info(`Quest completed: ${data.questId}`);
      this.broadcastToRenderer('quest-completed', data);
    });
  }

  private broadcastToRenderer(event: string, data: any): void {
    // This would be implemented to send data to the renderer process
    // via IPC or other communication mechanism
    logger.debug(`Broadcasting to renderer: ${event}`, data);
  }

  private async handleFileEvent(filePath: string, type: FileChange['type'], projectId: string, projectPath: string) {
    try {
      const relativePath = path.relative(projectPath, filePath);
      const change: FileChange = {
        filePath: relativePath,
        type,
        timestamp: new Date().toISOString()
      };

      if (type === 'add' || type === 'change') {
        const stats = await fs.promises.stat(filePath);
        change.stats = {
          size: stats.size,
          mtime: stats.mtime
        };

        if (stats.size < 1024 * 1024 && this.isTextFile(filePath)) {
          try {
            change.content = await fs.promises.readFile(filePath, 'utf8');
          } catch (error) {
            console.warn(`Could not read file content: ${filePath}`, error);
          }
        }
      }

      // Add to project-specific buffer
      if (!this.changeBuffer.has(projectId)) {
        this.changeBuffer.set(projectId, []);
      }
      this.changeBuffer.get(projectId)!.push(change);
      this.scheduleFlush(projectId);
    } catch (error) {
      console.error(`Error handling file event for ${filePath}:`, error);
    }
  }

  private scheduleFlush(projectId: string) {
    const existingTimer = this.flushTimers.get(projectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.flushProjectChanges(projectId);
    }, this.FLUSH_DELAY);
    
    this.flushTimers.set(projectId, timer);
  }

  private flushChanges() {
    if (this.changeBuffer.size === 0) return;

    const changes = Array.from(this.changeBuffer.entries()).flatMap(([projectId, projectChanges]) => projectChanges);
    this.changeBuffer.clear();
    
    this.callback(changes);
  }

  private flushProjectChanges(projectId: string) {
    const changes = this.changeBuffer.get(projectId);
    if (changes && changes.length > 0) {
      this.callback(changes);
      this.changeBuffer.delete(projectId);
    }
  }

  private isTextFile(filePath: string): boolean {
    const textExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
      '.html', '.htm', '.css', '.scss', '.sass', '.less',
      '.json', '.xml', '.yaml', '.yml', '.toml',
      '.md', '.mdx', '.txt', '.log',
      '.py', '.rb', '.php', '.java', '.c', '.cpp', '.h',
      '.go', '.rs', '.swift', '.kt', '.scala',
      '.sh', '.bash', '.zsh', '.fish',
      '.sql', '.graphql', '.gql',
      '.dockerfile', '.gitignore', '.env'
    ];

    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
  }

  public async getGitDiff(projectId: string, filePath?: string): Promise<string> {
    try {
      const git = this.git.get(projectId);
      if (!git) return '';
      
      if (filePath) {
        return await git.diff([filePath]);
      } else {
        return await git.diff();
      }
    } catch (error) {
      console.error('Git diff error:', error);
      return '';
    }
  }

  public async getGitStatus(projectId: string): Promise<any> {
    try {
      const git = this.git.get(projectId);
      if (!git) return null;
      
      return await git.status();
    } catch (error) {
      console.error('Git status error:', error);
      return null;
    }
  }

  public async getProjectInfo(projectId: string): Promise<{
    isGitRepo: boolean;
    branch?: string;
    remoteUrl?: string;
  }> {
    try {
      const git = this.git.get(projectId);
      if (!git) return { isGitRepo: false };
      
      const isRepo = await git.checkIsRepo();
      
      if (isRepo) {
        const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
        const remotes = await git.getRemotes(true);
        const remoteUrl = remotes.find((r: any) => r.name === 'origin')?.refs.fetch;

        return {
          isGitRepo: true,
          branch,
          remoteUrl
        };
      }

      return { isGitRepo: false };
    } catch (error) {
      logger.error('Project info error:', error);
      return { isGitRepo: false };
    }
  }
}

// Export singleton instance
let fileWatcherInstance: FileWatcher | null = null;

export function getFileWatcher(): FileWatcher {
  if (!fileWatcherInstance) {
    fileWatcherInstance = new FileWatcher((changes) => {
      // Default callback - could be overridden by renderer process
      logger.debug(`File changes detected:`, changes.length);
    });
  }
  return fileWatcherInstance;
}