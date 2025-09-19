import { io, Socket } from 'socket.io-client';

export interface WebSocketEventData {
  [key: string]: any;
}

export interface WebSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onUserStatusChanged?: (data: any) => void;
  onQuestUpdated?: (data: any) => void;
  onNewAnalysis?: (data: any) => void;
  onSkillProgressChanged?: (data: any) => void;
  onRatingChanged?: (data: any) => void;
  onExtensionStatusChanged?: (data: any) => void;
  onStudentActivity?: (data: any) => void;
  onError?: (error: string) => void;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.initializeEventListeners();
  }

  public connect(token: string, callbacks: WebSocketCallbacks = {}) {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.callbacks = callbacks;

    const wsUrl = import.meta.env.VITE_WS_URL || 'https://codeclimb.omori.f5.si';
    const cfAccessClientId = import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '';
    const cfAccessClientSecret = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '';

    const socketOptions: any = {
      auth: {
        token: token
      },
      transports: ['websocket'],
      timeout: 10000,
      forceNew: true
    };

    // Add Cloudflare Access headers if available
    if (cfAccessClientId && cfAccessClientSecret) {
      socketOptions.extraHeaders = {
        'CF-Access-Client-Id': cfAccessClientId,
        'CF-Access-Client-Secret': cfAccessClientSecret
      };
    }

    this.socket = io(wsUrl, socketOptions);

    this.setupEventHandlers();
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.callbacks.onConnect?.();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      this.callbacks.onDisconnect?.();

      // Attempt to reconnect if disconnection was not intentional
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.callbacks.onError?.(error.message);
      this.attemptReconnect();
    });

    this.socket.on('connected', (data) => {
      console.log('WebSocket connection confirmed:', data);
    });

    // Handle incoming events
    this.socket.on('user-status-changed', (data) => {
      this.callbacks.onUserStatusChanged?.(data);
    });

    this.socket.on('quest-updated', (data) => {
      this.callbacks.onQuestUpdated?.(data);
    });

    this.socket.on('new-analysis', (data) => {
      this.callbacks.onNewAnalysis?.(data);
    });

    this.socket.on('skill-progress-changed', (data) => {
      this.callbacks.onSkillProgressChanged?.(data);
    });

    this.socket.on('rating-changed', (data) => {
      this.callbacks.onRatingChanged?.(data);
    });

    this.socket.on('extension-status-changed', (data) => {
      this.callbacks.onExtensionStatusChanged?.(data);
    });

    this.socket.on('student-activity', (data) => {
      this.callbacks.onStudentActivity?.(data);
    });

    this.socket.on('sync-response', (data) => {
      console.log('Sync response received:', data);
      // Handle sync response if needed
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.callbacks.onError?.('Connection lost - max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  private initializeEventListeners() {
    // Listen for authentication token changes from main process
    window.electronAPI?.onTokenUpdated?.((token: string) => {
      if (this.socket && token) {
        this.socket.auth = { token };
        if (!this.socket.connected) {
          this.socket.connect();
        }
      }
    });
  }

  // Methods to emit events to the server
  public updateUserStatus(data: any) {
    if (this.socket?.connected) {
      this.socket.emit('user-status-update', data);
    }
  }

  public updateQuest(questData: any) {
    if (this.socket?.connected) {
      this.socket.emit('quest-update', questData);
    }
  }

  public updateSkillProgress(skillData: any) {
    if (this.socket?.connected) {
      this.socket.emit('skill-progress-update', skillData);
    }
  }

  public updateRating(ratingData: any) {
    if (this.socket?.connected) {
      this.socket.emit('rating-update', ratingData);
    }
  }

  public requestSync() {
    if (this.socket?.connected) {
      this.socket.emit('sync-request', {
        timestamp: new Date().toISOString(),
        source: 'pc-client'
      });
    }
  }

  public updateExtensionStatus(status: any) {
    if (this.socket?.connected) {
      this.socket.emit('extension-status', status);
    }
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();