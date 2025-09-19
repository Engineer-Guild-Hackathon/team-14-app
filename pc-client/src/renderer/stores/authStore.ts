import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'student' | 'teacher';
  createdAt: string;
  lastLoginAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isWebSocketConnected: boolean;
  extensionStatus: 'connected' | 'disconnected' | 'unknown';
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setWebSocketConnected: (connected: boolean) => void;
  setExtensionStatus: (status: 'connected' | 'disconnected' | 'unknown') => void;
  syncWithExtension: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isWebSocketConnected: false,
      extensionStatus: 'unknown',

      // Actions
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          // Mock API call - replace with actual API
          const response = await window.electronAPI.auth.login(email, password);

          if (response.success) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            set({
              error: response.error || 'ログインに失敗しました',
              isLoading: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'ログインエラーが発生しました',
            isLoading: false
          });
        }
      },

      logout: () => {
        try {
          window.electronAPI.auth.logout();
          set({
            user: null,
            isAuthenticated: false,
            error: null,
            isWebSocketConnected: false,
            extensionStatus: 'unknown'
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await window.electronAPI.auth.register(name, email, password);

          if (response.success) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            set({
              error: response.error || '登録に失敗しました',
              isLoading: false
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '登録エラーが発生しました',
            isLoading: false
          });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
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

      setWebSocketConnected: (connected: boolean) => {
        set({ isWebSocketConnected: connected });
      },

      setExtensionStatus: (status: 'connected' | 'disconnected' | 'unknown') => {
        set({ extensionStatus: status });
      },

      syncWithExtension: async () => {
        try {
          const result = await window.electronAPI.extension.sync();
          set({ extensionStatus: result.connected ? 'connected' : 'disconnected' });
        } catch (error) {
          console.error('Extension sync error:', error);
          set({ extensionStatus: 'unknown' });
        }
      },

      checkAuthStatus: async () => {
        try {
          set({ isLoading: true });
          const response = await window.electronAPI.auth.checkStatus();

          if (response.isAuthenticated && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Auth status check error:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Authentication status check failed'
          });
        }
      },
    }),
    {
      name: 'auth-store',
    }
  )
);