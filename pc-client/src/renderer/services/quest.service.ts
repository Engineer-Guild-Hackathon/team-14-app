// Quest Service for managing quest operations

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  tags: string[];
  estimatedDuration: number; // in minutes
  progress: {
    completedSteps: number;
    totalSteps: number;
    timeSpent: number; // in seconds
    startedAt?: string;
    completedAt?: string;
    lastActivityAt?: string;
  };
  project: {
    id: string;
    name: string;
    path: string;
  };
  steps: QuestStep[];
  source: {
    type: 'ARTICLE' | 'MANUAL' | 'TUTORIAL';
    url?: string;
    title?: string;
    articleId?: string;
  };
  rewards: {
    xp: number;
    badges: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface QuestStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  type: 'ARRANGE_CODE' | 'IMPLEMENT_CODE' | 'VERIFY_OUTPUT' | 'REVIEW_CODE';
  isCompleted: boolean;
  completedAt?: string;
  timeSpent: number; // in seconds
  hints: string[];
  codeSnippet?: string;
  expectedOutput?: string;
  verification?: {
    method: 'FILE_CONTENT' | 'OUTPUT_MATCH' | 'FUNCTION_CALL';
    target: string;
    pattern?: string;
  };
}

export interface QuestStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  paused: number;
  totalTimeSpent: number; // in seconds
  averageCompletionTime: number; // in seconds
  completionRate: number; // percentage
  streak: number; // consecutive days with quest activity
  favoriteCategory: string;
  recentCompletions: Quest[];
}

export interface QuestFilter {
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  projectId?: string;
  tag?: string;
  source?: 'ARTICLE' | 'MANUAL' | 'TUTORIAL';
  dateRange?: {
    from: string;
    to: string;
  };
}

class QuestService {
  private baseUrl = '/api/quests'; // This will be replaced with actual API calls

  // Mock data for development
  private mockQuests: Quest[] = [
    {
      id: '1',
      title: 'React Hooksの基本マスター',
      description: 'useStateとuseEffectを使って簡単なカウンターアプリを作成しよう',
      difficulty: 'EASY',
      status: 'IN_PROGRESS',
      tags: ['React', 'Hooks', 'JavaScript'],
      estimatedDuration: 30,
      progress: {
        completedSteps: 2,
        totalSteps: 4,
        timeSpent: 1200,
        startedAt: '2024-01-15T10:00:00Z',
        lastActivityAt: '2024-01-15T11:20:00Z'
      },
      project: {
        id: 'proj1',
        name: 'react-counter-app',
        path: '/Users/user/projects/react-counter-app'
      },
      steps: [
        {
          id: 'step1',
          stepNumber: 1,
          title: 'useStateでステート管理',
          description: 'useStateを使ってカウンターの値を管理しよう',
          type: 'IMPLEMENT_CODE',
          isCompleted: true,
          completedAt: '2024-01-15T10:15:00Z',
          timeSpent: 300,
          hints: ['useState(0)から始めよう', 'setCountで値を更新する']
        },
        {
          id: 'step2',
          stepNumber: 2,
          title: 'ボタンでカウンタを操作',
          description: 'インクリメント・デクリメントボタンを作成しよう',
          type: 'IMPLEMENT_CODE',
          isCompleted: true,
          completedAt: '2024-01-15T10:30:00Z',
          timeSpent: 450,
          hints: ['onClick イベントを使用', 'count + 1 と count - 1']
        },
        {
          id: 'step3',
          stepNumber: 3,
          title: 'useEffectでログ出力',
          description: 'カウンターの値が変更されたときにコンソールに出力しよう',
          type: 'IMPLEMENT_CODE',
          isCompleted: false,
          timeSpent: 450,
          hints: ['useEffect(() => {}, [count])', 'console.log を使用']
        },
        {
          id: 'step4',
          stepNumber: 4,
          title: 'スタイリング',
          description: 'CSSでカウンターアプリを美しくスタイリングしよう',
          type: 'IMPLEMENT_CODE',
          isCompleted: false,
          timeSpent: 0,
          hints: ['flexboxを使用してセンタリング', 'ボタンにhover効果を追加']
        }
      ],
      source: {
        type: 'ARTICLE',
        url: 'https://react.dev/learn/state-a-components-memory',
        title: 'State: A Component\'s Memory',
        articleId: 'react-hooks-tutorial'
      },
      rewards: {
        xp: 100,
        badges: ['react-beginner']
      },
      createdAt: '2024-01-15T09:45:00Z',
      updatedAt: '2024-01-15T11:20:00Z'
    },
    {
      id: '2',
      title: 'TypeScriptインターフェース設計',
      description: 'ユーザー管理システムのインターフェースを定義しよう',
      difficulty: 'MEDIUM',
      status: 'COMPLETED',
      tags: ['TypeScript', 'Interfaces', 'Design'],
      estimatedDuration: 45,
      progress: {
        completedSteps: 3,
        totalSteps: 3,
        timeSpent: 2100,
        startedAt: '2024-01-14T14:00:00Z',
        completedAt: '2024-01-14T14:35:00Z',
        lastActivityAt: '2024-01-14T14:35:00Z'
      },
      project: {
        id: 'proj2',
        name: 'user-management-system',
        path: '/Users/user/projects/user-management-system'
      },
      steps: [
        {
          id: 'step1',
          stepNumber: 1,
          title: 'Userインターフェース作成',
          description: 'ユーザー情報を表現するインターフェースを作成しよう',
          type: 'IMPLEMENT_CODE',
          isCompleted: true,
          completedAt: '2024-01-14T14:10:00Z',
          timeSpent: 600,
          hints: ['id, name, email, createdAtプロパティを含める']
        },
        {
          id: 'step2',
          stepNumber: 2,
          title: 'UserPermissionsインターフェース作成',
          description: 'ユーザー権限を表現するインターフェースを作成しよう',
          type: 'IMPLEMENT_CODE',
          isCompleted: true,
          completedAt: '2024-01-14T14:20:00Z',
          timeSpent: 600,
          hints: ['read, write, admin権限を定義']
        },
        {
          id: 'step3',
          stepNumber: 3,
          title: 'ジェネリクス活用',
          description: 'APIレスポンス用のジェネリックインターフェースを作成しよう',
          type: 'IMPLEMENT_CODE',
          isCompleted: true,
          completedAt: '2024-01-14T14:35:00Z',
          timeSpent: 900,
          hints: ['ApiResponse<T>の形で定義', 'data, status, messageプロパティを含める']
        }
      ],
      source: {
        type: 'TUTORIAL',
        title: 'TypeScript Interface Design Patterns',
        articleId: 'ts-interface-patterns'
      },
      rewards: {
        xp: 150,
        badges: ['typescript-architect']
      },
      createdAt: '2024-01-14T13:45:00Z',
      updatedAt: '2024-01-14T14:35:00Z'
    }
  ];

  // Get all quests for current user
  async getUserQuests(filter?: QuestFilter): Promise<Quest[]> {
    try {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

      let filteredQuests = [...this.mockQuests];

      if (filter) {
        if (filter.status) {
          filteredQuests = filteredQuests.filter(q => q.status === filter.status);
        }
        if (filter.difficulty) {
          filteredQuests = filteredQuests.filter(q => q.difficulty === filter.difficulty);
        }
        if (filter.projectId) {
          filteredQuests = filteredQuests.filter(q => q.project.id === filter.projectId);
        }
        if (filter.tag) {
          filteredQuests = filteredQuests.filter(q => q.tags.includes(filter.tag));
        }
        if (filter.source) {
          filteredQuests = filteredQuests.filter(q => q.source.type === filter.source);
        }
      }

      return filteredQuests;
    } catch (error) {
      console.error('Failed to get user quests:', error);
      throw new Error('クエストの取得に失敗しました');
    }
  }

  // Get quest statistics
  async getQuestStats(): Promise<QuestStats> {
    try {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));

      const allQuests = this.mockQuests;
      const completed = allQuests.filter(q => q.status === 'COMPLETED');
      const inProgress = allQuests.filter(q => q.status === 'IN_PROGRESS');
      const pending = allQuests.filter(q => q.status === 'PENDING');
      const paused = allQuests.filter(q => q.status === 'PAUSED');

      const totalTimeSpent = allQuests.reduce((sum, q) => sum + q.progress.timeSpent, 0);
      const averageCompletionTime = completed.length > 0
        ? completed.reduce((sum, q) => sum + q.progress.timeSpent, 0) / completed.length
        : 0;

      return {
        total: allQuests.length,
        completed: completed.length,
        inProgress: inProgress.length,
        pending: pending.length,
        paused: paused.length,
        totalTimeSpent,
        averageCompletionTime,
        completionRate: allQuests.length > 0 ? (completed.length / allQuests.length) * 100 : 0,
        streak: 5, // Mock streak
        favoriteCategory: 'React',
        recentCompletions: completed.slice(-5)
      };
    } catch (error) {
      console.error('Failed to get quest stats:', error);
      throw new Error('統計データの取得に失敗しました');
    }
  }

  // Get quest by ID
  async getQuestById(questId: string): Promise<Quest | null> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockQuests.find(q => q.id === questId) || null;
    } catch (error) {
      console.error('Failed to get quest:', error);
      throw new Error('クエストの取得に失敗しました');
    }
  }

  // Update quest progress
  async updateQuestProgress(questId: string, stepId: string, completed: boolean): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const quest = this.mockQuests.find(q => q.id === questId);
      if (quest) {
        const step = quest.steps.find(s => s.id === stepId);
        if (step) {
          step.isCompleted = completed;
          if (completed && !step.completedAt) {
            step.completedAt = new Date().toISOString();
          }

          // Update quest progress
          quest.progress.completedSteps = quest.steps.filter(s => s.isCompleted).length;
          quest.progress.lastActivityAt = new Date().toISOString();

          // Check if quest is completed
          if (quest.progress.completedSteps === quest.progress.totalSteps) {
            quest.status = 'COMPLETED';
            quest.progress.completedAt = new Date().toISOString();
          }

          quest.updatedAt = new Date().toISOString();
        }
      }
    } catch (error) {
      console.error('Failed to update quest progress:', error);
      throw new Error('進捗の更新に失敗しました');
    }
  }

  // Start quest
  async startQuest(questId: string): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const quest = this.mockQuests.find(q => q.id === questId);
      if (quest) {
        quest.status = 'IN_PROGRESS';
        quest.progress.startedAt = new Date().toISOString();
        quest.progress.lastActivityAt = new Date().toISOString();
        quest.updatedAt = new Date().toISOString();
      }
    } catch (error) {
      console.error('Failed to start quest:', error);
      throw new Error('クエストの開始に失敗しました');
    }
  }

  // Pause quest
  async pauseQuest(questId: string): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const quest = this.mockQuests.find(q => q.id === questId);
      if (quest) {
        quest.status = 'PAUSED';
        quest.updatedAt = new Date().toISOString();
      }
    } catch (error) {
      console.error('Failed to pause quest:', error);
      throw new Error('クエストの一時停止に失敗しました');
    }
  }

  // Resume quest
  async resumeQuest(questId: string): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const quest = this.mockQuests.find(q => q.id === questId);
      if (quest) {
        quest.status = 'IN_PROGRESS';
        quest.progress.lastActivityAt = new Date().toISOString();
        quest.updatedAt = new Date().toISOString();
      }
    } catch (error) {
      console.error('Failed to resume quest:', error);
      throw new Error('クエストの再開に失敗しました');
    }
  }

  // Format time duration
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      return `${remainingSeconds}秒`;
    }
  }

  // Get difficulty color
  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HARD': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  // Get status color
  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'text-gray-600 bg-gray-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'PAUSED': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
}

export default new QuestService();