import { useState, useEffect } from 'react';

// Get API and WebSocket URLs from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://codeclimb.omori.f5.si/api';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'https://codeclimb.omori.f5.si';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      
      // Check if electronAPI is available
      if (!window.electronAPI) {
        console.warn('ElectronAPI not available, running in web mode');
        setIsLoading(false);
        return;
      }

      const [storedUser, isAuthValid] = await Promise.all([
        window.electronAPI.user.get(),
        window.electronAPI.auth.isValid()
      ]);

      console.log('Auth check result:', { storedUser, isAuthValid });

      if (storedUser && isAuthValid) {
        setUser(storedUser);
        setIsAuthenticated(true);
      } else {
        // Clear invalid auth data
        await Promise.all([
          window.electronAPI.user.clear(),
          window.electronAPI.auth.clear()
        ]);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const response = await window.electronAPI.api.request({
        method: 'POST',
        url: `${API_BASE_URL}/auth/login`,
        data: credentials
      });

      console.log('Login response:', response);

      if (response.success) {
        console.log('Login success, response.data:', response.data);
        const { user: userData, tokens } = response.data;

        // Store user and auth data
        await Promise.all([
          window.electronAPI.user.set(userData),
          window.electronAPI.auth.set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
          })
        ]);

        setUser(userData);
        setIsAuthenticated(true);

        // Connect to socket
        await window.electronAPI.socket.connect(WS_BASE_URL);

        // Force a re-check to ensure consistency
        setTimeout(() => checkAuthStatus(), 100);

        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.data?.error?.message || 'ログインに失敗しました' 
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'ネットワークエラーが発生しました' 
      };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    try {
      const response = await window.electronAPI.api.request({
        method: 'POST',
        url: `${API_BASE_URL}/auth/register`,
        data
      });

      console.log('Register response:', response);

      if (response.success) {
        console.log('Register success, response.data:', response.data);
        const { user: userData, tokens } = response.data;

        // Store user and auth data
        await Promise.all([
          window.electronAPI.user.set(userData),
          window.electronAPI.auth.set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
          })
        ]);

        setUser(userData);
        setIsAuthenticated(true);

        // Connect to socket
        await window.electronAPI.socket.connect(WS_BASE_URL);

        // Force a re-check to ensure consistency
        setTimeout(() => checkAuthStatus(), 100);

        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.data?.error?.message || '登録に失敗しました' 
        };
      }
    } catch (error: any) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: 'ネットワークエラーが発生しました' 
      };
    }
  };

  const logout = async () => {
    try {
      // Disconnect socket
      await window.electronAPI.socket.disconnect();

      // Clear auth data
      await Promise.all([
        window.electronAPI.user.clear(),
        window.electronAPI.auth.clear()
      ]);

      setUser(null);
      setIsAuthenticated(false);

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'ログアウトに失敗しました' };
    }
  };

  const refreshToken = async () => {
    try {
      const auth = await window.electronAPI.auth.get();
      
      if (!auth?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await window.electronAPI.api.request({
        method: 'POST',
        url: `${API_BASE_URL}/auth/refresh`,
        data: { refreshToken: auth.refreshToken }
      });

      if (response.success) {
        const { tokens } = response.data;
        
        await window.electronAPI.auth.set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        return { success: true };
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, log out
      await logout();
      return { success: false };
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    checkAuthStatus
  };
}