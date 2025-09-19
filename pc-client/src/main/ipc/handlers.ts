import { BrowserWindow, ipcMain, dialog } from 'electron';
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
    try {
      const newProject = configStore.addProject(project);
      return { success: true, project: newProject };
    } catch (error: any) {
      console.error('Error adding project:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:update', (_, id: string, updates: Partial<ProjectConfig>) => {
    try {
      const success = configStore.updateProject(id, updates);
      return { success };
    } catch (error: any) {
      console.error('Error updating project:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:remove', (_, id: string) => {
    try {
      const success = configStore.removeProject(id);
      return { success };
    } catch (error: any) {
      console.error('Error removing project:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:get', (_, id: string) => {
    try {
      const project = configStore.getProject(id);
      return { success: true, project };
    } catch (error: any) {
      console.error('Error getting project:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:getAll', () => {
    try {
      const projects = configStore.getProjects();
      return { success: true, projects };
    } catch (error: any) {
      console.error('Error getting projects:', error);
      return { success: false, error: error.message, projects: [] };
    }
  });

  ipcMain.handle('project:setActive', (_, id: string) => {
    try {
      const success = configStore.setActiveProject(id);
      return { success };
    } catch (error: any) {
      console.error('Error setting active project:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:getActive', () => {
    try {
      const project = configStore.getActiveProject();
      return { success: true, project };
    } catch (error: any) {
      console.error('Error getting active project:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:setCurrent', (_, id: string) => {
    try {
      const success = configStore.setActiveProject(id);
      configStore.set('currentProject', configStore.getProject(id));
      return { success };
    } catch (error: any) {
      console.error('Error setting current project:', error);
      return { success: false, error: error.message };
    }
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
      const baseUrl = process.env.VITE_API_URL || 'https://codeclimb.omori.f5.si/api';
      const cfAccessClientId = process.env.VITE_CF_ACCESS_CLIENT_ID || '867ff0dd303ae2bf7b6f8cf0d88b0374.access';
      const cfAccessClientSecret = process.env.VITE_CF_ACCESS_CLIENT_SECRET || '27eae7ab520da49391f99d4c66bf2a14635f567c5f6b62410d7327622d1a4d34';

      const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Add Cloudflare Access headers
      if (cfAccessClientId && cfAccessClientSecret) {
        headers['CF-Access-Client-Id'] = cfAccessClientId;
        headers['CF-Access-Client-Secret'] = cfAccessClientSecret;
      }

      if (auth?.accessToken) {
        headers.Authorization = `Bearer ${auth.accessToken}`;
      }

      // Construct full URL if relative URL is provided
      const fullUrl = options.url.startsWith('http') ? options.url : `${baseUrl}${options.url}`;

      const response = await axios({
        method: options.method,
        url: fullUrl,
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
  ipcMain.handle('socket:connect', (_, serverUrl?: string) => {
    try {
      const auth = configStore.getAuth();

      if (!auth?.accessToken) {
        return { success: false, error: 'No access token available' };
      }

      if (socketConnection) {
        socketConnection.disconnect();
      }

      const wsUrl = serverUrl || process.env.VITE_WS_URL || 'https://codeclimb.omori.f5.si';
      const cfAccessClientId = process.env.VITE_CF_ACCESS_CLIENT_ID || '867ff0dd303ae2bf7b6f8cf0d88b0374.access';
      const cfAccessClientSecret = process.env.VITE_CF_ACCESS_CLIENT_SECRET || '27eae7ab520da49391f99d4c66bf2a14635f567c5f6b62410d7327622d1a4d34';

      const socketOptions: any = {
        auth: {
          token: auth.accessToken
        },
        transports: ['websocket']
      };

      // Add Cloudflare Access headers if available
      if (cfAccessClientId && cfAccessClientSecret) {
        socketOptions.extraHeaders = {
          'CF-Access-Client-Id': cfAccessClientId,
          'CF-Access-Client-Secret': cfAccessClientSecret
        };
      }

      socketConnection = io(wsUrl, socketOptions);

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

  // Dialog handlers
  ipcMain.handle('dialog:showOpenDialog', async (_, options: any) => {
    try {
      console.log('🔵 [dialog:showOpenDialog] Called with options:', options);
      const result = await dialog.showOpenDialog(mainWindow, options);
      console.log('🔵 [dialog:showOpenDialog] Result:', result);
      return result;
    } catch (error: any) {
      console.error('🔵 [dialog:showOpenDialog] Error:', error);
      return { canceled: true, filePaths: [] };
    }
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