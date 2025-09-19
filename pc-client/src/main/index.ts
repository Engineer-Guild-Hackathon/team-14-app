import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { setupIPCHandlers } from './ipc/handlers';
import { getFileWatcher } from './services/fileWatcher';
import { ConfigStore } from './store/config';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

class ElectronApp {
  private mainWindow: BrowserWindow | null = null;
  private configStore: ConfigStore;

  constructor() {
    this.configStore = new ConfigStore();
    this.initialize();
  }

  private initialize() {
    this.setupAppEvents();
    this.setupAutoUpdater();
  }

  private setupAppEvents() {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIPCHandlers();
      this.handleDeepLinks();
      
      if (!isDev) {
        this.checkForUpdates();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js'),
        webSecurity: !isDev,
        allowRunningInsecureContent: isDev,
        experimentalFeatures: isDev
      },
      show: false,
      icon: path.join(__dirname, '../../assets/icon.png')
    });

    if (isDev) {
      console.log('Loading development URL: http://localhost:3001');
      this.mainWindow.loadURL('http://localhost:3001');
      this.mainWindow.webContents.openDevTools();
      
      // Debug resource loading
      this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Failed to load: ${validatedURL} - ${errorDescription} (${errorCode})`);
      });

      this.mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`Console[${level}]: ${message} at ${sourceId}:${line}`);
      });

      this.mainWindow.webContents.on('did-finish-load', () => {
        console.log('Page finished loading');
      });
    } else {
      const htmlPath = path.join(__dirname, '../../dist/renderer/index.html');
      console.log('Loading production file:', htmlPath);
      this.mainWindow.loadFile(htmlPath);
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private setupIPCHandlers() {
    if (!this.mainWindow) return;
    
    setupIPCHandlers(this.mainWindow, this.configStore);

    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:getPlatform', () => {
      return process.platform;
    });


    ipcMain.handle('file-watcher:start', (_, projectPath: string) => {
      return this.startFileWatcher(projectPath);
    });

    ipcMain.handle('file-watcher:stop', () => {
      return this.stopFileWatcher();
    });
  }

  private async startFileWatcher(projectPath: string): Promise<boolean> {
    try {
      const fileWatcher = getFileWatcher();
      const config = this.configStore.get('currentProject');
      
      if (!config || !config.id) {
        console.error('No active project configuration found');
        return false;
      }

      await fileWatcher.startWatchingProject({
        projectId: config.id,
        projectPath: projectPath,
        userId: this.configStore.get('userId') || '',
        // questId: config.questId,
        includePatterns: ['**/*.{js,jsx,ts,tsx,html,css,json}'],
        excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });

      console.log(`File watcher started for project: ${config.id} at ${projectPath}`);
      return true;
    } catch (error) {
      console.error('Failed to start file watcher:', error);
      return false;
    }
  }

  private async stopFileWatcher(): Promise<boolean> {
    try {
      const fileWatcher = getFileWatcher();
      const config = this.configStore.get('currentProject');
      
      if (config && config.id) {
        await fileWatcher.stopWatchingProject(config.id);
        console.log(`File watcher stopped for project: ${config.id}`);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to stop file watcher:', error);
      return false;
    }
  }

  private handleDeepLinks() {
    if (isDev && process.platform === 'win32') {
      app.setAsDefaultProtocolClient('codeclimb', process.execPath, [
        path.resolve(process.argv[1])
      ]);
    } else {
      app.setAsDefaultProtocolClient('codeclimb');
    }

    app.on('open-url', (event, url) => {
      event.preventDefault();
      if (this.mainWindow) {
        this.mainWindow.webContents.send('deep-link', url);
        this.mainWindow.focus();
      }
    });

    if (process.platform === 'win32') {
      const url = process.argv.find(arg => arg.startsWith('codeclimb://'));
      if (url) {
        setTimeout(() => {
          this.mainWindow?.webContents.send('deep-link', url);
        }, 1000);
      }
    }
  }

  private setupAutoUpdater() {
    if (isDev) return;

    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      this.mainWindow?.webContents.send('update-available');
    });

    autoUpdater.on('update-downloaded', () => {
      this.mainWindow?.webContents.send('update-downloaded');
    });

    ipcMain.handle('updater:quitAndInstall', () => {
      autoUpdater.quitAndInstall();
    });
  }

  private checkForUpdates() {
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000); // Check every hour
  }

  private cleanup() {
    this.stopFileWatcher();
    this.configStore.cleanup?.();
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].focus();
    }
  });

  new ElectronApp();
}