import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [selectedProjectPath, setSelectedProjectPath] = useState('');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    console.log('showAddProject state changed:', showAddProject);
  }, [showAddProject]);

  useEffect(() => {
    console.log('Projects array changed. Length:', projects.length, 'Projects:', projects);
  }, [projects]);

  // Initial data loading
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Listen for WebSocket events
  useEffect(() => {
    const handleQuestProgress = (data: any) => {
      console.log('Quest progress received:', data);
      loadActiveQuests();
    };

    const handleQuestCompleted = (data: any) => {
      console.log('Quest completed:', data);
      loadActiveQuests();
      loadUserStats();
      loadRecentActivities();
    };

    const handleFileUpdate = (data: any) => {
      console.log('File update received:', data);
      // Refresh activities to show file changes
      loadRecentActivities();
    };

    // Register event listeners
    window.electronAPI.on('file-watcher:quest-progress', handleQuestProgress);
    window.electronAPI.on('file-watcher:quest-completed', handleQuestCompleted);
    window.electronAPI.on('socket:file-update', handleFileUpdate);
    window.electronAPI.on('socket:quest-progress', handleQuestProgress);

    // Cleanup
    return () => {
      window.electronAPI.off('file-watcher:quest-progress');
      window.electronAPI.off('file-watcher:quest-completed');
      window.electronAPI.off('socket:file-update');
      window.electronAPI.off('socket:quest-progress');
    };
  }, []);

  // Monitor activeQuests state changes
  useEffect(() => {
    console.log('🔄 [activeQuests Effect] Active quests state changed:', activeQuests);
    console.log('🔄 [activeQuests Effect] Active quests length:', activeQuests.length);
    if (activeQuests.length > 0) {
      console.log('🔄 [activeQuests Effect] First quest:', activeQuests[0]);
    }
  }, [activeQuests]);

  const loadDashboardData = async () => {
    console.log('📊 [loadDashboardData] Starting to load dashboard data...');
    setLoading(true);
    try {
      console.log('📊 [loadDashboardData] Loading projects...');
      await refreshProjects();
      
      console.log('📊 [loadDashboardData] Projects loaded, now loading active quests...');
      await loadActiveQuests();
      
      console.log('📊 [loadDashboardData] Active quests loaded, now loading user stats...');
      await loadUserStats();
      
      console.log('📊 [loadDashboardData] User stats loaded, now loading recent activities...');
      await loadRecentActivities();
      
      console.log('📊 [loadDashboardData] All data loaded successfully');
      console.log('📊 [loadDashboardData] Current state - Projects:', projects);
      console.log('📊 [loadDashboardData] Current state - Active Quests:', activeQuests);
    } catch (error) {
      console.error('📊 [loadDashboardData] Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      console.log('📊 [loadDashboardData] Loading complete');
    }
  };;

  const loadActiveQuests = async () => {
    console.log('🔍 [loadActiveQuests] Starting to load active quests...');
    try {
      // First, let's check what quests exist for the active project
      const activeProject = projects.find(p => p.isActive);
      console.log('🔍 [loadActiveQuests] Active project:', activeProject);
      
      // Load both PENDING and IN_PROGRESS quests
      const response = await window.electronAPI.api.request({
        method: 'GET',
        url: 'http://localhost:3000/api/quests?status=PENDING,IN_PROGRESS'
      });
      
      console.log('🔍 [loadActiveQuests] API Response:', response);
      
      if (response.success) {
        const quests = response.data.quests || [];
        console.log('🔍 [loadActiveQuests] Found quests:', quests);
        console.log('🔍 [loadActiveQuests] Quest count:', quests.length);
        console.log('🔍 [loadActiveQuests] Quest statuses:', quests.map((q: any) => ({ id: q.id, title: q.title, status: q.status })));
        
        setActiveQuests(quests);
        console.log('🔍 [loadActiveQuests] State updated with quests');
      } else {
        console.warn('🔍 [loadActiveQuests] API request was not successful:', response);
      }
    } catch (error) {
      console.error('🔍 [loadActiveQuests] Failed to load active quests:', error);
    }
  };;

  const loadUserStats = async () => {
    try {
      const response = await window.electronAPI.api.request({
        method: 'GET',
        url: 'http://localhost:3000/api/analytics/progress'
      });
      
      if (response.success) {
        setUserStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const response = await window.electronAPI.api.request({
        method: 'GET',
        url: 'http://localhost:3000/api/analytics/activities?limit=10'
      });
      
      if (response.success) {
        setRecentActivities(response.data.activities || []);
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

  const handleSelectFolder = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openDirectory'],
        title: 'プロジェクトフォルダを選択',
        buttonLabel: '選択'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        const folderName = folderPath.split('/').pop() || '';
        
        console.log('Selected folder:', folderPath, 'Name:', folderName);
        
        setSelectedProjectPath(folderPath);
        setProjectName(folderName);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleAddProject = async (projectData: { name: string; path: string; description?: string }) => {
    try {
      console.log('🏗️ [handleAddProject] Starting to add project...', projectData);
      
      // Convert 'path' to 'localPath' to match the backend and useProject interface
      const createProjectData = {
        name: projectData.name,
        localPath: projectData.path,
        description: projectData.description
      };
      console.log('🏗️ [handleAddProject] Converted data for createProject:', createProjectData);
      
      const result = await createProject(createProjectData);
      console.log('🏗️ [handleAddProject] createProject result:', result);
      
      if (result) {
        console.log('✅ [handleAddProject] Project created successfully, closing modal and refreshing');
        setShowAddProject(false);
        setSelectedProjectPath('');
        setProjectName('');
        
        console.log('🔄 [handleAddProject] Refreshing projects list...');
        await refreshProjects();
        console.log('✅ [handleAddProject] Projects list refreshed');
      } else {
        console.error('❌ [handleAddProject] Project creation failed - no result returned');
      }
    } catch (error) {
      console.error('❌ [handleAddProject] Exception occurred:', error);
    }
  };

  const handleQuestContinue = async (quest: Quest) => {
    console.log('🎯 [handleQuestContinue] Starting quest:', quest);
    try {
      // Check if quest has project information
      const projectId = quest.project?.id || quest.projectId;
      console.log('🎯 [handleQuestContinue] Project ID:', projectId);
      
      if (!projectId) {
        console.error('🎯 [handleQuestContinue] No project ID found in quest');
        alert('エラー: クエストにプロジェクト情報が見つかりません');
        return;
      }
      
      // Find the project in the projects list
      const targetProject = projects.find(p => p.id === projectId);
      console.log('🎯 [handleQuestContinue] Found target project:', targetProject);
      
      if (!targetProject) {
        console.error('🎯 [handleQuestContinue] Project not found in projects list:', projectId);
        console.log('🎯 [handleQuestContinue] Available projects:', projects);
        alert('エラー: 関連するプロジェクトが見つかりません');
        return;
      }
      
      // Open the project
      console.log('🎯 [handleQuestContinue] Opening project:', targetProject.name);
      openProject(targetProject);
      
      console.log('🎯 [handleQuestContinue] Quest continued successfully');
      
      // Navigate to quest details page
      console.log('🎯 [handleQuestContinue] Navigating to quest details page:', `/quest/${quest.id}`);
      navigate(`/quest/${quest.id}`);
      
    } catch (error) {
      console.error('🎯 [handleQuestContinue] Failed to continue quest:', error);
      alert('エラー: クエストの開始に失敗しました');
    }
  };;;;

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
                    type="button"
                    onClick={(e) => {
                      console.log('🔴 MAIN プロジェクト追加 button clicked');
                      console.log('🔴 Event:', e);
                      console.log('🔴 Current showAddProject value:', showAddProject);
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAddProject(true);
                      console.log('🔴 setShowAddProject(true) called');
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
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
                        type="button"
                        onClick={(e) => {
                          console.log('🟡 EMPTY STATE プロジェクト追加 button clicked');
                          console.log('🟡 Event:', e);
                          console.log('🟡 Current showAddProject value:', showAddProject);
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAddProject(true);
                          console.log('🟡 setShowAddProject(true) called');
                        }}
                        className="mt-2 text-blue-600 hover:text-blue-700 font-medium cursor-pointer focus:outline-none focus:underline"
                      >
                        最初のプロジェクトを追加してください
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Quests */}
            {console.log('🎯 [Render] activeQuests state:', activeQuests)}
            {console.log('🎯 [Render] activeQuests.length:', activeQuests.length)}
            {activeQuests.length > 0 && (
              <div className="mt-6 bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">進行中のクエスト</h3>
                  <div className="space-y-4">
                    {activeQuests.slice(0, 3).map((quest) => {
                      console.log('🎯 [Render] Rendering quest:', quest);
                      return (
                        <div key={quest.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{quest.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">{quest.project?.name || quest.projectId || 'プロジェクト不明'}</p>
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
                            onClick={() => {
                              console.log('🔴 [Button Click] Continue button clicked for quest:', quest.id);
                              handleQuestContinue(quest);
                            }}
                            className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                          >
                            続行
                          </button>
                        </div>
                      </div>
                      );
                    })}
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
                name: projectName,
                path: selectedProjectPath,
                description: formData.get('description') as string,
              });
            }}>
              <div className="space-y-4">
                {/* Folder Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">プロジェクトフォルダ</label>
                  <button
                    type="button"
                    onClick={handleSelectFolder}
                    className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H6a2 2 0 00-2 2z" />
                    </svg>
                    {selectedProjectPath ? 'フォルダを変更' : 'フォルダを選択'}
                  </button>
                  
                  {selectedProjectPath && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600 break-all">{selectedProjectPath}</p>
                    </div>
                  )}
                </div>

                {/* Auto-populated Project Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">プロジェクト名</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="プロジェクト名を入力..."
                  />
                </div>

                {/* Optional Description */}
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
                  disabled={!selectedProjectPath || !projectName.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProject(false);
                    setSelectedProjectPath('');
                    setProjectName('');
                  }}
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