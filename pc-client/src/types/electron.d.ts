// Type definitions for Electron API exposed to renderer process

export interface ElectronAPI {
  getVersion(): Promise<string>;
  getPlatform(): Promise<string>;
  
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  saveState(): Promise<boolean>;

  showOpenDialog(options: any): Promise<any>;

  config: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<boolean>;
    getAll(): Promise<any>;
  };

  user: {
    set(user: any): Promise<boolean>;
    get(): Promise<any>;
    clear(): Promise<boolean>;
  };

  auth: {
    set(auth: any): Promise<boolean>;
    get(): Promise<any>;
    clear(): Promise<boolean>;
    isValid(): Promise<boolean>;
  };

  project: {
    add(project: any): Promise<any>;
    update(id: string, updates: any): Promise<boolean>;
    remove(id: string): Promise<boolean>;
    get(id: string): Promise<any>;
    getAll(): Promise<any[]>;
    setActive(id: string): Promise<boolean>;
    getActive(): Promise<any>;
  };

  api: {
    request(options: any): Promise<any>;
  };

  socket: {
    connect(serverUrl: string): Promise<any>;
    disconnect(): Promise<any>;
    emit(event: string, data: any): Promise<any>;
    isConnected(): Promise<boolean>;
  };

  fileWatcher: {
    start(projectPath: string): Promise<boolean>;
    stop(): Promise<boolean>;
  };

  system: {
    getPath(name: string): Promise<string>;
  };

  on(channel: string, callback: Function): void;
  off(channel: string, callback?: Function): void;
  once(channel: string, callback: Function): void;
  cleanup(): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}