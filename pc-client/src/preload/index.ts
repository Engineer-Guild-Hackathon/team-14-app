import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
  // App methods
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  
  // Window methods
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  saveState: () => ipcRenderer.invoke('window:saveState'),

  // Dialog methods
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),

  // Config methods
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:getAll')
  },

  // User methods
  user: {
    set: (user: any) => ipcRenderer.invoke('user:set', user),
    get: () => ipcRenderer.invoke('user:get'),
    clear: () => ipcRenderer.invoke('user:clear')
  },

  // Auth methods
  auth: {
    set: (auth: any) => ipcRenderer.invoke('auth:set', auth),
    get: () => ipcRenderer.invoke('auth:get'),
    clear: () => ipcRenderer.invoke('auth:clear'),
    isValid: () => ipcRenderer.invoke('auth:isValid')
  },

  // Project methods
  project: {
    add: (project: any) => ipcRenderer.invoke('project:add', project),
    update: (id: string, updates: any) => ipcRenderer.invoke('project:update', id, updates),
    remove: (id: string) => ipcRenderer.invoke('project:remove', id),
    get: (id: string) => ipcRenderer.invoke('project:get', id),
    getAll: () => ipcRenderer.invoke('project:getAll'),
    setActive: (id: string) => ipcRenderer.invoke('project:setActive', id),
    getActive: () => ipcRenderer.invoke('project:getActive')
  },

  // API methods
  api: {
    request: (options: any) => ipcRenderer.invoke('api:request', options)
  },

  // Socket methods
  socket: {
    connect: (serverUrl: string) => ipcRenderer.invoke('socket:connect', serverUrl),
    disconnect: () => ipcRenderer.invoke('socket:disconnect'),
    emit: (event: string, data: any) => ipcRenderer.invoke('socket:emit', event, data),
    isConnected: () => ipcRenderer.invoke('socket:isConnected')
  },

  // File watcher methods
  fileWatcher: {
    start: (projectPath: string) => ipcRenderer.invoke('file-watcher:start', projectPath),
    stop: () => ipcRenderer.invoke('file-watcher:stop')
  },

  // System methods
  system: {
    getPath: (name: string) => ipcRenderer.invoke('system:getPath', name)
  },

  // Event listeners
  on: (channel: string, callback: Function) => {
    const validChannels = [
      'file-changes',
      'deep-link',
      'update-available',
      'update-downloaded',
      'auth:expired',
      'socket:connected',
      'socket:disconnected',
      'socket:error',
      'socket:verification-result',
      'socket:quest-progress',
      'socket:file-update',
      'file-watcher:file-change',
      'file-watcher:file-sync',
      'file-watcher:quest-progress',
      'file-watcher:quest-completed',
      'file-watcher:verification-result'
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },

  off: (channel: string, callback?: Function) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // One-time event listener
  once: (channel: string, callback: Function) => {
    const validChannels = [
      'file-changes',
      'deep-link',
      'update-available',
      'update-downloaded',
      'auth:expired',
      'socket:connected',
      'socket:disconnected',
      'socket:error',
      'socket:verification-result',
      'socket:quest-progress',
      'socket:file-update'
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (_, ...args) => callback(...args));
    }
  },

  // Cleanup
  cleanup: () => ipcRenderer.send('app:cleanup')
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Types are now defined in separate file