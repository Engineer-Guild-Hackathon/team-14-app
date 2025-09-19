import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  isActive: boolean;
  questCount: number;
  completedQuests: number;
  lastAccessedAt: string;
  createdAt: string;
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

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

interface ProjectActions {
  // Project management
  addProject: (path: string, name: string, description?: string) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;

  // Directory operations
  selectDirectory: () => Promise<string | null>;

  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Data fetching
  loadProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;

  // Project sync
  syncProject: (projectId: string) => Promise<void>;
  toggleProjectSync: (projectId: string, enabled: boolean) => Promise<void>;
}

export type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,

      // Actions
      addProject: async (path: string, name: string, description?: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await window.electronAPI.project.add({
            path,
            name,
            description,
            settings: {
              autoWatch: true,
              syncEnabled: true,
              excludePatterns: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/*.log'
              ]
            }
          });

          if (response.success) {
            const updatedProjects = [...get().projects, response.project];
            set({
              projects: updatedProjects,
              isLoading: false
            });
          } else {
            set({
              error: response.error || 'プロジェクトの追加に失敗しました',
              isLoading: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'プロジェクト追加エラー',
            isLoading: false
          });
        }
      },

      removeProject: async (projectId: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await window.electronAPI.project.remove(projectId);

          if (response.success) {
            const updatedProjects = get().projects.filter(p => p.id !== projectId);
            const currentProject = get().currentProject;

            set({
              projects: updatedProjects,
              currentProject: currentProject?.id === projectId ? null : currentProject,
              isLoading: false
            });
          } else {
            set({
              error: response.error || 'プロジェクトの削除に失敗しました',
              isLoading: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'プロジェクト削除エラー',
            isLoading: false
          });
        }
      },

      updateProject: async (projectId: string, updates: Partial<Project>) => {
        try {
          set({ isLoading: true, error: null });

          const response = await window.electronAPI.project.update(projectId, updates);

          if (response.success) {
            const updatedProjects = get().projects.map(p =>
              p.id === projectId ? { ...p, ...updates } : p
            );

            set({
              projects: updatedProjects,
              currentProject: get().currentProject?.id === projectId
                ? { ...get().currentProject!, ...updates }
                : get().currentProject,
              isLoading: false
            });
          } else {
            set({
              error: response.error || 'プロジェクトの更新に失敗しました',
              isLoading: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'プロジェクト更新エラー',
            isLoading: false
          });
        }
      },

      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project });

        // Notify electron main process about current project change
        if (project) {
          window.electronAPI.project.setCurrent(project.id);
        }
      },

      selectDirectory: async () => {
        try {
          const result = await window.electronAPI.showOpenDialog({
            properties: ['openDirectory'],
            title: 'プロジェクトフォルダを選択してください'
          });

          if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return null;
          }

          return result.filePaths[0];
        } catch (error) {
          console.error('Directory selection error:', error);
          set({ error: 'ディレクトリの選択に失敗しました' });
          return null;
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      loadProjects: async () => {
        try {
          set({ isLoading: true, error: null });

          const response = await window.electronAPI.project.getAll();

          if (response.success) {
            set({
              projects: response.projects || [],
              isLoading: false
            });
          } else {
            set({
              error: response.error || 'プロジェクトの読み込みに失敗しました',
              isLoading: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'プロジェクト読み込みエラー',
            isLoading: false
          });
        }
      },

      refreshProjects: async () => {
        await get().loadProjects();
      },

      syncProject: async (projectId: string) => {
        try {
          const response = await window.electronAPI.project.sync(projectId);

          if (!response.success) {
            set({ error: response.error || 'プロジェクトの同期に失敗しました' });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'プロジェクト同期エラー'
          });
        }
      },

      toggleProjectSync: async (projectId: string, enabled: boolean) => {
        try {
          const response = await window.electronAPI.project.toggleSync(projectId, enabled);

          if (response.success) {
            const updatedProjects = get().projects.map(p =>
              p.id === projectId
                ? { ...p, settings: { ...p.settings, syncEnabled: enabled } }
                : p
            );

            set({ projects: updatedProjects });
          } else {
            set({ error: response.error || '同期設定の変更に失敗しました' });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '同期設定エラー'
          });
        }
      },
    }),
    {
      name: 'project-store',
    }
  )
);