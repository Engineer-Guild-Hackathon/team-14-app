import Store from 'electron-store';

export interface AppConfig {
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  auth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
  server?: {
    url: string;
    connected: boolean;
    lastConnected?: string;
  };
  projects: ProjectConfig[];
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'ja' | 'en';
    notifications: {
      desktop: boolean;
      sound: boolean;
      questCompleted: boolean;
      fileChanges: boolean;
    };
    fileWatcher: {
      enabled: boolean;
      debounceMs: number;
      excludePatterns: string[];
    };
  };
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
  };
}

export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  description?: string;
  lastOpened: string;
  isActive: boolean;
  settings: {
    autoWatch: boolean;
    syncEnabled: boolean;
    excludePatterns: string[];
  };
  git?: {
    isRepo: boolean;
    branch?: string;
    remoteUrl?: string;
  };
}

const defaultConfig: AppConfig = {
  projects: [],
  preferences: {
    theme: 'system',
    language: 'ja',
    notifications: {
      desktop: true,
      sound: true,
      questCompleted: true,
      fileChanges: false
    },
    fileWatcher: {
      enabled: true,
      debounceMs: 500,
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/*.log'
      ]
    }
  },
  window: {
    width: 1200,
    height: 800,
    maximized: false
  }
};

export class ConfigStore {
  private store: Store<AppConfig>;

  constructor() {
    this.store = new Store<AppConfig>({
      name: 'codeclimb-config',
      defaults: defaultConfig,
      schema: {
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              path: { type: 'string' },
              description: { type: 'string' },
              lastOpened: { type: 'string' },
              isActive: { type: 'boolean' },
              settings: {
                type: 'object',
                properties: {
                  autoWatch: { type: 'boolean' },
                  syncEnabled: { type: 'boolean' },
                  excludePatterns: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            required: ['id', 'name', 'path', 'lastOpened', 'isActive', 'settings']
          }
        },
        preferences: {
          type: 'object',
          properties: {
            theme: {
              type: 'string',
              enum: ['light', 'dark', 'system']
            },
            language: {
              type: 'string',
              enum: ['ja', 'en']
            }
          }
        },
        window: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            height: { type: 'number' },
            x: { type: 'number' },
            y: { type: 'number' }
          }
        }
      }
    });
  }

  get<T extends keyof AppConfig>(key: T): AppConfig[T];
  get(key: string): any;
  get<T extends keyof AppConfig>(key: T | string): AppConfig[T] | any {
    return this.store.get(key as keyof AppConfig);
  }

  set<T extends keyof AppConfig>(key: T, value: AppConfig[T]): void;
  set(key: string, value: any): void;
  set<T extends keyof AppConfig>(key: T | string, value: AppConfig[T] | any): void {
    this.store.set(key as keyof AppConfig, value);
  }

  getAll(): AppConfig {
    return this.store.store;
  }

  reset(): void {
    this.store.clear();
  }

  // User management
  setUser(user: AppConfig['user']): void {
    this.set('user', user);
  }

  getUser(): AppConfig['user'] {
    return this.get('user');
  }

  clearUser(): void {
    this.store.delete('user');
    this.store.delete('auth');
  }

  // Auth management
  setAuth(auth: AppConfig['auth']): void {
    this.set('auth', auth);
  }

  getAuth(): AppConfig['auth'] {
    return this.get('auth');
  }

  clearAuth(): void {
    this.store.delete('auth');
  }

  isAuthValid(): boolean {
    const auth = this.getAuth();
    return !!(auth && auth.accessToken && auth.expiresAt > Date.now());
  }

  // Project management
  addProject(project: Omit<ProjectConfig, 'id' | 'lastOpened' | 'isActive'>): ProjectConfig {
    const newProject: ProjectConfig = {
      ...project,
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastOpened: new Date().toISOString(),
      isActive: false
    };

    const projects = this.get('projects');
    projects.push(newProject);
    this.set('projects', projects);

    return newProject;
  }

  updateProject(id: string, updates: Partial<ProjectConfig>): boolean {
    const projects = this.get('projects');
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return false;

    projects[index] = { ...projects[index], ...updates };
    this.set('projects', projects);

    return true;
  }

  removeProject(id: string): boolean {
    const projects = this.get('projects');
    const filteredProjects = projects.filter(p => p.id !== id);

    if (filteredProjects.length === projects.length) return false;

    this.set('projects', filteredProjects);
    return true;
  }

  getProject(id: string): ProjectConfig | undefined {
    const projects = this.get('projects');
    return projects.find(p => p.id === id);
  }

  getProjects(): ProjectConfig[] {
    return this.get('projects');
  }

  setActiveProject(id: string): boolean {
    const projects = this.get('projects');
    const project = projects.find(p => p.id === id);

    if (!project) return false;

    projects.forEach(p => {
      p.isActive = p.id === id;
      if (p.id === id) {
        p.lastOpened = new Date().toISOString();
      }
    });

    this.set('projects', projects);
    return true;
  }

  getActiveProject(): ProjectConfig | undefined {
    const projects = this.get('projects');
    return projects.find(p => p.isActive);
  }

  // Preferences management
  updatePreferences(updates: Partial<AppConfig['preferences']>): void {
    const current = this.get('preferences');
    this.set('preferences', { ...current, ...updates });
  }

  // Window state management
  saveWindowState(bounds: { width: number; height: number; x?: number; y?: number }, maximized: boolean): void {
    this.set('window', {
      ...bounds,
      maximized
    });
  }

  getWindowState(): AppConfig['window'] {
    return this.get('window');
  }


  cleanup(): void {
    // Cleanup logic if needed
  }
}