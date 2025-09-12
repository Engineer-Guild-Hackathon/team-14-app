// Background script for CodeClimb Chrome Extension

interface StoredData {
  auth?: {
    accessToken: string;
    userId: string;
  };
  settings?: {
    serverUrl: string;
    autoGenerate: boolean;
  };
  activeProject?: {
    id: string;
    name: string;
  };
}

class BackgroundService {
  private serverUrl = 'http://localhost:3000';

  constructor() {
    this.setupEventListeners();
    this.initialize();
  }

  private setupEventListeners() {
    // Extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.onInstall();
      } else if (details.reason === 'update') {
        this.onUpdate(details.previousVersion);
      }
    });

    // Tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Message handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Context menu
    this.setupContextMenu();
  }

  private async initialize() {
    console.log('CodeClimb background service initialized');
    
    // Check authentication status
    const auth = await this.getStoredData('auth');
    if (auth) {
      console.log('User authenticated:', auth.userId);
    }
  }

  private onInstall() {
    console.log('CodeClimb extension installed');
    
    // Set default settings
    chrome.storage.local.set({
      settings: {
        serverUrl: this.serverUrl,
        autoGenerate: false
      }
    });

    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html?welcome=true')
    });
  }

  private onUpdate(previousVersion?: string) {
    console.log('CodeClimb extension updated from', previousVersion);
  }

  private async handleTabUpdate(tabId: number, tab: chrome.tabs.Tab) {
    if (!tab.url) return;

    const isTechnicalArticle = this.isTechnicalArticlePage(tab.url);
    
    if (isTechnicalArticle) {
      // Update badge to indicate this is a supported page
      chrome.action.setBadgeText({
        tabId,
        text: '✓'
      });
      
      chrome.action.setBadgeBackgroundColor({
        tabId,
        color: '#22c55e'
      });

      // Inject content script if not already injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
      } catch (error) {
        // Content script might already be injected
        console.log('Content script injection failed:', error);
      }
    } else {
      chrome.action.setBadgeText({
        tabId,
        text: ''
      });
    }
  }

  private isTechnicalArticlePage(url: string): boolean {
    const technicalDomains = [
      'qiita.com',
      'zenn.dev',
      'dev.to',
      'medium.com',
      'developer.mozilla.org',
      'stackoverflow.com'
    ];

    const blogPatterns = [
      /\/blog\//,
      /\.blog\//,
      /blog\./
    ];

    return technicalDomains.some(domain => url.includes(domain)) ||
           blogPatterns.some(pattern => pattern.test(url));
  }

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    try {
      switch (message.type) {
        case 'GET_CURRENT_TAB':
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          sendResponse({ tab: tabs[0] });
          break;

        case 'SET_AUTH':
          await chrome.storage.local.set({ auth: message.data });
          sendResponse({ success: true });
          break;

        case 'GET_AUTH':
          const auth = await this.getStoredData('auth');
          sendResponse({ auth });
          break;

        case 'CLEAR_AUTH':
          await chrome.storage.local.remove('auth');
          sendResponse({ success: true });
          break;

        case 'SET_ACTIVE_PROJECT':
          await chrome.storage.local.set({ activeProject: message.data });
          sendResponse({ success: true });
          break;

        case 'GET_ACTIVE_PROJECT':
          const project = await this.getStoredData('activeProject');
          sendResponse({ project });
          break;

        case 'GENERATE_QUEST':
          const result = await this.generateQuest(message.data);
          sendResponse(result);
          break;

        case 'EXTRACT_ARTICLE_CONTENT':
          const content = await this.extractArticleContent(sender.tab?.id);
          sendResponse({ content });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ error: (error as Error).message });
    }
  }

  private async extractArticleContent(tabId?: number): Promise<any> {
    if (!tabId) throw new Error('No tab ID provided');

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Extract article content from the page
        const title = document.title;
        const url = window.location.href;
        
        // Try to find main content
        const contentSelectors = [
          'article',
          '[role="main"]',
          '.article-content',
          '.post-content',
          '.entry-content',
          'main'
        ];

        let content = '';
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            content = element.textContent || '';
            break;
          }
        }

        // Extract code blocks
        const codeBlocks = Array.from(document.querySelectorAll('pre code, .highlight, .code-block')).map(
          block => block.textContent || ''
        );

        return {
          title,
          url,
          content: content.substring(0, 5000), // Limit content length
          codeBlocks: codeBlocks.slice(0, 10) // Limit number of code blocks
        };
      }
    });

    return results[0]?.result;
  }

  private async generateQuest(data: {
    articleUrl: string;
    implementationGoal: string;
    difficulty: string;
    projectId: string;
  }): Promise<any> {
    try {
      const auth = await this.getStoredData('auth');
      
      if (!auth?.accessToken) {
        throw new Error('Authentication required');
      }

      // Set up AbortController for fetch timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
      let response;
      try {
        response = await fetch(`${this.serverUrl}/api/quests/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.accessToken}`
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'CodeClimb',
        message: 'クエストが正常に生成されました！'
      });

      return { success: true, quest: result.quest };
    } catch (error) {
      console.error('Quest generation failed:', error);
      
      // Handle timeout specifically
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: false, error: 'Request timeout - please try again' };
      }
      
      return { success: false, error: (error as Error).message };
    }
  }

  private setupContextMenu() {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'codeclimb-generate',
        title: 'CodeClimbでクエスト生成',
        contexts: ['page', 'selection'],
        documentUrlPatterns: [
          '*://qiita.com/*',
          '*://zenn.dev/*',
          '*://dev.to/*',
          '*://medium.com/*',
          '*://developer.mozilla.org/*',
          '*://stackoverflow.com/*',
          '*://*/*blog*'
        ]
      });
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === 'codeclimb-generate' && tab?.id) {
        // Open popup or extension page
        chrome.action.openPopup();
      }
    });
  }

  private async getStoredData(key: keyof StoredData): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }
}

// Initialize the background service
new BackgroundService();