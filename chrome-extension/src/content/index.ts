// Content script for CodeClimb Chrome Extension

class ContentScriptManager {
  private isInitialized = false;
  private questOverlay: HTMLElement | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('CodeClimb content script loaded');
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupContent());
    } else {
      this.setupContent();
    }

    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  private setupContent() {
    this.addCodeClimbIndicator();
    this.setupCodeBlockEnhancements();
  }

  private addCodeClimbIndicator() {
    // Add a subtle indicator that this page is CodeClimb-compatible
    const indicator = document.createElement('div');
    indicator.id = 'codeclimb-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        z-index: 10000;
        cursor: pointer;
        transition: all 0.3s ease;
        opacity: 0.8;
      " onmouseover="this.style.opacity='1'; this.style.transform='scale(1.05)'" 
         onmouseout="this.style.opacity='0.8'; this.style.transform='scale(1)'">
        ⛰️ CodeClimb
      </div>
    `;

    indicator.addEventListener('click', () => {
      this.openQuestGenerator();
    });

    document.body.appendChild(indicator);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.style.opacity = '0';
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }
    }, 5000);
  }

  private setupCodeBlockEnhancements() {
    // Add hover effects and copy buttons to code blocks
    const codeBlocks = document.querySelectorAll('pre code, .highlight, .code-block, pre');
    
    codeBlocks.forEach((block, index) => {
      if (block.parentElement?.querySelector('.codeclimb-enhance')) return;

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.className = 'codeclimb-enhance';
      
      // Wrap the code block
      block.parentNode?.insertBefore(wrapper, block);
      wrapper.appendChild(block);

      // Add copy button
      const copyButton = document.createElement('button');
      copyButton.innerHTML = '📋';
      copyButton.title = 'コードをコピー';
      Object.assign(copyButton.style, {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: '12px',
        opacity: '0',
        transition: 'opacity 0.2s',
        zIndex: '100'
      });

      // Add quest button
      const questButton = document.createElement('button');
      questButton.innerHTML = '⛰️';
      questButton.title = 'このコードでクエスト生成';
      Object.assign(questButton.style, {
        position: 'absolute',
        top: '8px',
        right: '40px',
        background: 'rgba(59, 130, 246, 0.9)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: '12px',
        opacity: '0',
        transition: 'opacity 0.2s',
        zIndex: '100'
      });

      wrapper.appendChild(copyButton);
      wrapper.appendChild(questButton);

      // Show buttons on hover
      wrapper.addEventListener('mouseenter', () => {
        copyButton.style.opacity = '1';
        questButton.style.opacity = '1';
      });

      wrapper.addEventListener('mouseleave', () => {
        copyButton.style.opacity = '0';
        questButton.style.opacity = '0';
      });

      // Copy functionality
      copyButton.addEventListener('click', () => {
        const text = block.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
          copyButton.innerHTML = '✅';
          setTimeout(() => {
            copyButton.innerHTML = '📋';
          }, 2000);
        });
      });

      // Quest generation functionality
      questButton.addEventListener('click', () => {
        this.openQuestGeneratorWithCode(block.textContent || '');
      });
    });
  }

  private openQuestGenerator() {
    // Send message to open popup
    chrome.runtime.sendMessage({
      type: 'OPEN_QUEST_GENERATOR',
      data: {
        url: window.location.href,
        title: document.title
      }
    });
  }

  private openQuestGeneratorWithCode(code: string) {
    // Send message to open popup with specific code
    chrome.runtime.sendMessage({
      type: 'OPEN_QUEST_GENERATOR',
      data: {
        url: window.location.href,
        title: document.title,
        selectedCode: code
      }
    });
  }

  private handleMessage(message: any, sender: any, sendResponse: (response?: any) => void) {
    switch (message.type) {
      case 'GET_PAGE_CONTENT':
        const content = this.extractPageContent();
        sendResponse({ content });
        break;

      case 'HIGHLIGHT_CODE':
        this.highlightCode(message.data.code);
        sendResponse({ success: true });
        break;

      case 'SHOW_QUEST_PROGRESS':
        this.showQuestProgress(message.data);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  private extractPageContent() {
    return {
      title: document.title,
      url: window.location.href,
      content: document.body.textContent?.substring(0, 5000) || '',
      codeBlocks: Array.from(document.querySelectorAll('pre code, .highlight, .code-block'))
        .map(block => block.textContent || '')
        .slice(0, 10),
      headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent || ''
        }))
        .slice(0, 20)
    };
  }

  private highlightCode(code: string) {
    // Highlight specific code in the page
    const codeBlocks = document.querySelectorAll('pre code, .highlight, .code-block');
    
    codeBlocks.forEach(block => {
      if (block.textContent?.includes(code)) {
        const element = block as HTMLElement;
        element.style.background = 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)';
        element.style.border = '2px solid #3b82f6';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  private showQuestProgress(data: { questId: string; stepId: string; success: boolean }) {
    // Show quest progress overlay
    if (this.questOverlay) {
      this.questOverlay.remove();
    }

    this.questOverlay = document.createElement('div');
    Object.assign(this.questOverlay.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: data.success ? '#22c55e' : '#ef4444',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      zIndex: '10001',
      animation: 'slideInFromTop 0.3s ease-out'
    });

    this.questOverlay.innerHTML = data.success 
      ? '✅ ステップ完了！次に進みましょう' 
      : '❌ もう一度チャレンジしてみましょう';

    document.body.appendChild(this.questOverlay);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (this.questOverlay) {
        this.questOverlay.style.animation = 'slideOutToTop 0.3s ease-in';
        setTimeout(() => {
          if (this.questOverlay && this.questOverlay.parentNode) {
            this.questOverlay.parentNode.removeChild(this.questOverlay);
          }
        }, 300);
      }
    }, 3000);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInFromTop {
    from {
      transform: translate(-50%, -100%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutToTop {
    from {
      transform: translate(-50%, 0);
      opacity: 1;
    }
    to {
      transform: translate(-50%, -100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize content script
new ContentScriptManager();