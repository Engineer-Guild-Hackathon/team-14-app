// Message handling utilities for Chrome Extension

export interface Message {
  type: string;
  data?: any;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
  tab?: chrome.tabs.Tab;
  auth?: { accessToken: string; userId: string };
  project?: { id: string; name: string };
  content?: any;
}

export class MessageHandler {
  static async sendToBackground(message: Message): Promise<MessageResponse> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  static async sendToContentScript(tabId: number, message: Message): Promise<MessageResponse> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  static async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    const response = await this.sendToBackground({ type: 'GET_CURRENT_TAB' });
    return response.success ? (response.tab || null) : null;
  }

  static async setAuth(auth: { accessToken: string; userId: string }): Promise<boolean> {
    const response = await this.sendToBackground({
      type: 'SET_AUTH',
      data: auth
    });
    return response.success;
  }

  static async getAuth(): Promise<{ accessToken: string; userId: string } | null> {
    const response = await this.sendToBackground({ type: 'GET_AUTH' });
    return response.success ? (response.auth || null) : null;
  }

  static async clearAuth(): Promise<boolean> {
    const response = await this.sendToBackground({ type: 'CLEAR_AUTH' });
    return response.success;
  }

  static async setActiveProject(project: { id: string; name: string }): Promise<boolean> {
    const response = await this.sendToBackground({
      type: 'SET_ACTIVE_PROJECT',
      data: project
    });
    return response.success;
  }

  static async getActiveProject(): Promise<{ id: string; name: string } | null> {
    const response = await this.sendToBackground({ type: 'GET_ACTIVE_PROJECT' });
    return response.success ? (response.project || null) : null;
  }

  static async generateQuest(data: {
    articleUrl: string;
    implementationGoal: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    projectId: string;
  }): Promise<{ success: boolean; quest?: any; error?: string }> {
    const response = await this.sendToBackground({
      type: 'GENERATE_QUEST',
      data
    });
    return response;
  }

  static async extractArticleContent(): Promise<any> {
    const response = await this.sendToBackground({
      type: 'EXTRACT_ARTICLE_CONTENT'
    });
    return response.success ? response.content : null;
  }
}

export class StorageManager {
  static async get(key: string): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  static async set(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  static async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve);
    });
  }

  static async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }

  // Sync storage methods
  static async getSync(key: string): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  static async setSync(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, resolve);
    });
  }
}

export class APIManager {
  private static baseUrl = 'http://localhost:3000/api';

  static async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const auth = await MessageHandler.getAuth();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (auth?.accessToken) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  static async login(credentials: { email: string; password: string }) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    if (response.tokens) {
      await MessageHandler.setAuth({
        accessToken: response.tokens.accessToken,
        userId: response.user.id
      });
    }

    return response;
  }

  static async getProjects() {
    return await this.request('/projects');
  }

  static async generateQuest(data: {
    articleUrl: string;
    implementationGoal: string;
    difficulty: string;
    projectId: string;
  }) {
    return await this.request('/quests/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getStepCodeBlocks(stepId: string) {
    return await this.request(`/quests/steps/${stepId}/code-blocks`);
  }

  static async submitCodeArrangement(stepId: string, arrangement: string[]) {
    return await this.request(`/quests/steps/${stepId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ arrangement })
    });
  }

  // Phase2以降に保留 - 今はやらない
  /*
  static async getImplementationsByArticle(articleUrl: string, options: { 
    sort?: string; 
    limit?: number; 
  }) {
    const params = new URLSearchParams({
      articleUrl,
      ...(options.sort && { sort: options.sort }),
      ...(options.limit && { limit: options.limit.toString() })
    });
    
    return await this.request(`/gallery/article?${params}`);
  }

  static async likeImplementation(implementationId: string) {
    return await this.request(`/gallery/${implementationId}/like`, {
      method: 'POST'
    });
  }
  */

  static async createSummitRecord(data: {
    questId: string;
    reflection: string;
    codeSnapshot: any;
    implementationTime: number;
    techStack: string[];
    isPublic: boolean;
    isPortfolio: boolean;
  }) {
    return await this.request('/achievements/summit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export class NotificationManager {
  static async show(options: {
    title: string;
    message: string;
    type?: 'basic' | 'progress';
    iconUrl?: string;
  }) {
    if (!chrome.notifications) return;

    chrome.notifications.create({
      type: options.type || 'basic',
      iconUrl: options.iconUrl || 'icons/icon-48.png',
      title: options.title,
      message: options.message
    });
  }

  static async showSuccess(message: string) {
    await this.show({
      title: 'CodeClimb',
      message,
      iconUrl: 'icons/icon-48.png'
    });
  }

  static async showError(message: string) {
    await this.show({
      title: 'CodeClimb - エラー',
      message,
      iconUrl: 'icons/icon-48.png'
    });
  }
}