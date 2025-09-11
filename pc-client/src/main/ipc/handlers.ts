import { BrowserWindow, ipcMain } from 'electron';
import { ConfigStore, ProjectConfig } from '../store/config';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export function setupIPCHandlers(mainWindow: BrowserWindow, configStore: ConfigStore) {
  let socketConnection: Socket | null = null;

  // Config handlers
  ipcMain.handle('config:get', (_, key: string) => {
    return configStore.get(key as any);
  });

  ipcMain.handle('config:set', (_, key: string, value: any) => {
    configStore.set(key as any, value);
    return true;
  });

  ipcMain.handle('config:getAll', () => {
    return configStore.getAll();
  });

  // User handlers
  ipcMain.handle('user:set', (_, user: any) => {
    configStore.setUser(user);
    return true;
  });

  ipcMain.handle('user:get', () => {
    return configStore.getUser();
  });

  ipcMain.handle('user:clear', () => {
    configStore.clearUser();
    return true;
  });

  // Auth handlers
  ipcMain.handle('auth:set', (_, auth: any) => {
    configStore.setAuth(auth);
    return true;
  });

  ipcMain.handle('auth:get', () => {
    return configStore.getAuth();
  });

  ipcMain.handle('auth:clear', () => {
    configStore.clearAuth();
    return true;
  });

  ipcMain.handle('auth:isValid', () => {
    return configStore.isAuthValid();
  });

  // Project handlers
  ipcMain.handle('project:add', (_, project: Omit<ProjectConfig, 'id' | 'lastOpened' | 'isActive'>) => {
    return configStore.addProject(project);
  });

  ipcMain.handle('project:update', (_, id: string, updates: Partial<ProjectConfig>) => {
    return configStore.updateProject(id, updates);
  });

  ipcMain.handle('project:remove', (_, id: string) => {
    return configStore.removeProject(id);
  });

  ipcMain.handle('project:get', (_, id: string) => {
    return configStore.getProject(id);
  });

  ipcMain.handle('project:getAll', () => {
    return configStore.getProjects();
  });

  ipcMain.handle('project:setActive', (_, id: string) => {
    return configStore.setActiveProject(id);
  });

  ipcMain.handle('project:getActive', () => {
    return configStore.getActiveProject();
  });

  // API handlers
  ipcMain.handle('api:request', async (_, options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    data?: any;
    params?: any;
  }) => {
    try {
      const auth = configStore.getAuth();
      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (auth?.accessToken) {
        headers.Authorization = `Bearer ${auth.accessToken}`;
      }

      const response = await axios({
        method: options.method,
        url: options.url,
        data: options.data,
        params: options.params,
        headers,
        timeout: 30000
      });

      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error: any) {
      console.error('API request error:', error);
      
      if (error.response?.status === 401) {
        configStore.clearAuth();
        mainWindow.webContents.send('auth:expired');
      }

      return {
        success: false,
        error: error.message,
        status: error.response?.status || 0,
        data: error.response?.data
      };
    }
  });

  // Socket connection handlers
  ipcMain.handle('socket:connect', (_, serverUrl: string) => {
    try {
      const auth = configStore.getAuth();
      
      if (!auth?.accessToken) {
        return { success: false, error: 'No access token available' };
      }

      if (socketConnection) {
        socketConnection.disconnect();
      }

      socketConnection = io(serverUrl, {
        auth: {
          token: auth.accessToken
        },
        transports: ['websocket']
      });

      socketConnection.on('connect', () => {
        console.log('Socket connected');
        mainWindow.webContents.send('socket:connected');
      });

      socketConnection.on('disconnect', () => {
        console.log('Socket disconnected');
        mainWindow.webContents.send('socket:disconnected');
      });

      socketConnection.on('error', (error) => {
        console.error('Socket error:', error);
        mainWindow.webContents.send('socket:error', error.message);
      });

      // Forward socket events to renderer
      socketConnection.on('verification-result', (data) => {
        mainWindow.webContents.send('socket:verification-result', data);
      });

      socketConnection.on('quest-progress', (data) => {
        mainWindow.webContents.send('socket:quest-progress', data);
      });

      socketConnection.on('file-update', (data) => {
        mainWindow.webContents.send('socket:file-update', data);
      });

      return { success: true };
    } catch (error: any) {
      console.error('Socket connection error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('socket:disconnect', () => {
    try {
      if (socketConnection) {
        socketConnection.disconnect();
        socketConnection = null;
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('socket:emit', (_, event: string, data: any) => {
    try {
      if (socketConnection && socketConnection.connected) {
        socketConnection.emit(event, data);
        return { success: true };
      } else {
        return { success: false, error: 'Socket not connected' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('socket:isConnected', () => {
    return socketConnection?.connected || false;
  });

  // Window handlers
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:saveState', () => {
    const bounds = mainWindow.getBounds();
    const maximized = mainWindow.isMaximized();
    configStore.saveWindowState(bounds, maximized);
    return true;
  });

  // System info handlers
  ipcMain.handle('system:getPath', (_, name: string) => {
    const { app } = require('electron');
    return app.getPath(name as any);
  });

  // Cleanup on app quit
  ipcMain.on('app:cleanup', () => {
    if (socketConnection) {
      socketConnection.disconnect();
    }
  });
}