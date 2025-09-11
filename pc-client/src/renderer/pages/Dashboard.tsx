import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { ProjectCard } from '../components/ProjectCard';

interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  progress: {
    completedSteps: number;
    totalSteps: number;
    timeSpent: number;
    startedAt?: string;
    completedAt?: string;
  };
  project: {
    id: string;
    name: string;
  };
  steps: Array<{
    id: string;
    stepNumber: number;
    title: string;
    description: string;
    type: 'ARRANGE_CODE' | 'IMPLEMENT_CODE' | 'VERIFY_OUTPUT';
    isCompleted: boolean;
  }>;
}

interface UserStats {
  totalQuests: number;
  completedQuests: number;
  inProgressQuests: number;
  totalProjects: number;
  totalLearningHours: number;
  currentStreak: number;
  summitRecords: number;
  averageQuestTime: number;
  skillLevel: string;
  recentAchievements: Array<{
    id: string;
    title: string;
    description: string;
    earnedAt: string;
    type: 'QUEST_COMPLETION' | 'STREAK' | 'SUMMIT' | 'SKILL_LEVEL';
  }>;
}

interface Project {
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
  activeQuest?: Quest;
  stats?: {
    totalQuests: number;
    completedQuests: number;
    lastActivity: string;
  };
}

interface Activity {
  id: string;
  type: 'QUEST_STARTED' | 'QUEST_COMPLETED' | 'PROJECT_ADDED' | 'CODE_VERIFIED' | 'SUMMIT_RECORDED';
  title: string;
  description: string;
  timestamp: string;
  questId?: string;
  projectId?: string;
  metadata?: {
    difficulty?: string;
    timeSpent?: number;
    score?: number;
  };
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const { projects, createProject, openProject, refreshProjects } = useProject();
  
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);

  // Initial data loading
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load projects
      await refreshProjects();
      
      // Load active quests
      await loadActiveQuests();
      
      // Load user stats
      await loadUserStats();
      
      // Load recent activities
      await loadRecentActivities();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveQuests = async () => {
    try {
      const response = await fetch('/api/quests?status=IN_PROGRESS', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveQuests(data.quests || []);
      }
    } catch (error) {
      console.error('Failed to load active quests:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/analytics/progress', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const response = await fetch('/api/analytics/activities?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to load recent activities:', error);
    }
  };

  const handleProjectSelect = async (project: Project) => {
    try {
      await openProject(project.id);
      // Navigate to project view or update state
    } catch (error) {
      console.error('Failed to select project:', error);
    }
  };

  const handleAddProject = async (projectData: { name: string; path: string; description?: string }) => {
    try {
      await createProject(projectData);
      setShowAddProject(false);
      await refreshProjects();
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const handleQuestContinue = async (quest: Quest) => {
    try {
      // Open the project associated with the quest
      await openProject(quest.project.id);
      // Navigate to quest view or start quest
    } catch (error) {
      console.error('Failed to continue quest:', error);
    }
  };

  const refreshStats = async () => {
    await Promise.all([
      loadUserStats(),
      loadActiveQuests(),
      loadRecentActivities()
    ]);
  };

  const formatLearningTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}分`;
    }
    return `${Math.round(hours)}時間`;
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'QUEST_COMPLETED':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'QUEST_STARTED':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'PROJECT_ADDED':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'CODE_VERIFIED':
        return (
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'SUMMIT_RECORDED':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l6 6 6-6 4 4v12H1V7l4-4z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getDifficultyColor = (difficulty: Quest['difficulty']) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">CodeClimb ダッシュボード</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshStats}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="データを更新"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-3">
                {user?.avatar && (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.avatar}
                    alt={user.name}
                  />
                )}
                <div className="text-sm">
                  <p className="text-gray-900 font-medium">{user?.name}</p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md hover:bg-gray-100"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">完了クエスト</dt>
                      <dd className="text-lg font-medium text-gray-900">{userStats?.completedQuests || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">進行中</dt>
                      <dd className="text-lg font-medium text-gray-900">{userStats?.inProgressQuests || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">学習時間</dt>
                      <dd className="text-lg font-medium text-gray-900">{formatLearningTime(userStats?.totalLearningHours || 0)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l6 6 6-6 4 4v12H1V7l4-4z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">登頂記録</dt>
                      <dd className="text-lg font-medium text-gray-900">{userStats?.summitRecords || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Projects Section */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">プロジェクト</h3>
                  <button
                    onClick={() => setShowAddProject(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    プロジェクト追加
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelect={() => handleProjectSelect(project)}
                    />
                  ))}
                  
                  {projects.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p>プロジェクトがありません</p>
                      <button
                        onClick={() => setShowAddProject(true)}
                        className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        最初のプロジェクトを追加してください
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Quests */}
            {activeQuests.length > 0 && (
              <div className="mt-6 bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">進行中のクエスト</h3>
                  <div className="space-y-4">
                    {activeQuests.slice(0, 3).map((quest) => (
                      <div key={quest.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{quest.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">{quest.project.name}</p>
                            <div className="flex items-center mt-2 space-x-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(quest.difficulty)}`}>
                                {quest.difficulty}
                              </span>
                              <div className="flex items-center text-sm text-gray-500">
                                <span>{quest.progress.completedSteps}/{quest.progress.totalSteps} ステップ完了</span>
                              </div>
                            </div>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(quest.progress.completedSteps / quest.progress.totalSteps) * 100}%`
                                }}
                              ></div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleQuestContinue(quest)}
                            className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                          >
                            続行
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activities Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">最近のアクティビティ</h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {recentActivities.map((activity, activityIdx) => (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {activityIdx !== recentActivities.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-gray-900">
                                <p>{activity.title}</p>
                              </div>
                              <div className="mt-1 text-sm text-gray-500">
                                <p>{activity.description}</p>
                              </div>
                              <div className="mt-1 text-xs text-gray-400">
                                {new Date(activity.timestamp).toLocaleString('ja-JP')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {recentActivities.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">最近のアクティビティはありません</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">新しいプロジェクトを追加</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleAddProject({
                name: formData.get('name') as string,
                path: formData.get('path') as string,
                description: formData.get('description') as string,
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">プロジェクト名</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="例: React Todo App"
                  />
                </div>
                <div>
                  <label htmlFor="path" className="block text-sm font-medium text-gray-700">プロジェクトパス</label>
                  <input
                    type="text"
                    name="path"
                    id="path"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="/Users/username/projects/my-app"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">説明（任意）</label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="プロジェクトの説明..."
                  />
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProject(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}