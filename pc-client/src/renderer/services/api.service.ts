interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

class ApiService {
  private baseUrl: string;
  private cfAccessClientId: string;
  private cfAccessClientSecret: string;
  private defaultTimeout = 10000;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'https://codeclimb.omori.f5.si/api';
    this.cfAccessClientId = import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '';
    this.cfAccessClientSecret = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '';
  }

  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add Cloudflare Access headers if available
    if (this.cfAccessClientId && this.cfAccessClientSecret) {
      headers['CF-Access-Client-Id'] = this.cfAccessClientId;
      headers['CF-Access-Client-Secret'] = this.cfAccessClientSecret;
    }

    // Add authorization header if token exists
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private getAuthToken(): string | null {
    // Try to get token from localStorage or electron store
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  public setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  public clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async makeRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = {
      ...this.getDefaultHeaders(),
      ...headers
    };

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as T;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Auth API methods
  public async login(email: string, password: string) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  }

  public async register(name: string, email: string, password: string) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password }
    });
  }

  public async refreshToken(refreshToken: string) {
    return this.makeRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken }
    });
  }

  public async logout() {
    return this.makeRequest('/auth/logout', {
      method: 'POST'
    });
  }

  // User API methods
  public async getCurrentUser() {
    return this.makeRequest('/users/me');
  }

  public async updateProfile(data: any) {
    return this.makeRequest('/users/profile', {
      method: 'PUT',
      body: data
    });
  }

  // Project API methods
  public async getProjects() {
    return this.makeRequest('/projects');
  }

  public async createProject(data: any) {
    return this.makeRequest('/projects', {
      method: 'POST',
      body: data
    });
  }

  public async updateProject(projectId: string, data: any) {
    return this.makeRequest(`/projects/${projectId}`, {
      method: 'PUT',
      body: data
    });
  }

  public async deleteProject(projectId: string) {
    return this.makeRequest(`/projects/${projectId}`, {
      method: 'DELETE'
    });
  }

  // Quest API methods
  public async getQuests(projectId?: string) {
    const queryParams = projectId ? `?projectId=${projectId}` : '';
    return this.makeRequest(`/quests${queryParams}`);
  }

  public async getQuest(questId: string) {
    return this.makeRequest(`/quests/${questId}`);
  }

  public async createQuest(data: any) {
    return this.makeRequest('/quests', {
      method: 'POST',
      body: data
    });
  }

  public async updateQuest(questId: string, data: any) {
    return this.makeRequest(`/quests/${questId}`, {
      method: 'PUT',
      body: data
    });
  }

  public async startQuest(questId: string) {
    return this.makeRequest(`/quests/${questId}/start`, {
      method: 'POST'
    });
  }

  public async pauseQuest(questId: string) {
    return this.makeRequest(`/quests/${questId}/pause`, {
      method: 'POST'
    });
  }

  public async completeQuest(questId: string) {
    return this.makeRequest(`/quests/${questId}/complete`, {
      method: 'POST'
    });
  }

  // Analytics API methods
  public async getAnalytics(projectId?: string) {
    const queryParams = projectId ? `?projectId=${projectId}` : '';
    return this.makeRequest(`/analytics${queryParams}`);
  }

  // Health check
  public async healthCheck() {
    return this.makeRequest('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default ApiService;