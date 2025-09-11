import React, { useState, useEffect } from 'react';
import { MessageHandler, APIManager } from '../utils/messageHandler';
import CodeArrangement from './components/CodeArrangement';
import ImplementationGallery from './components/ImplementationGallery';
import SummitRecordButton from './components/SummitRecordButton';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  steps: QuestStep[];
}

interface QuestStep {
  id: string;
  title: string;
  description: string;
  type: string;
  isCompleted: boolean;
}

type ViewState = 'loading' | 'login' | 'projectSelect' | 'questGenerate' | 'questProgress' | 'codeArrangement' | 'implementationGallery';

function App() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentQuest, setCurrentQuest] = useState<Quest | null>(null);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  // Component-specific state
  const [activeStepId, setActiveStepId] = useState<string>('');
  const [codeBlocks, setCodeBlocks] = useState<any[]>([]);
  const [questCompleted, setQuestCompleted] = useState(false);

  // Form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [questForm, setQuestForm] = useState({
    implementationGoal: '',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD'
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Get current tab
      const tab = await MessageHandler.getCurrentTab();
      setCurrentTab(tab);

      // Check authentication
      const auth = await MessageHandler.getAuth();
      
      if (auth) {
        // Get user projects
        const projectsData = await APIManager.getProjects();
        setProjects(projectsData.projects || []);

        // Get active project
        const project = await MessageHandler.getActiveProject();
        setActiveProject(project);

        setUser({ id: auth.userId, name: '', email: '' });
        
        if (project) {
          setViewState('questGenerate');
        } else {
          setViewState('projectSelect');
        }
      } else {
        setViewState('login');
      }
    } catch (error) {
      console.error('Initialization error:', error);
      setError('アプリの初期化に失敗しました');
      setViewState('login');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await APIManager.login(loginForm);
      
      if (response.user) {
        setUser(response.user);
        
        // Get projects
        const projectsData = await APIManager.getProjects();
        setProjects(projectsData.projects || []);
        
        setViewState('projectSelect');
      }
    } catch (error: any) {
      setError(error.message || 'ログインに失敗しました');
    }
  };

  const handleProjectSelect = async (project: Project) => {
    await MessageHandler.setActiveProject(project);
    setActiveProject(project);
    setViewState('questGenerate');
  };

  const handleQuestGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !currentTab?.url) return;

    setIsGenerating(true);
    setError('');

    try {
      const result = await MessageHandler.generateQuest({
        articleUrl: currentTab.url,
        implementationGoal: questForm.implementationGoal,
        difficulty: questForm.difficulty,
        projectId: activeProject.id
      });

      if (result.success) {
        setCurrentQuest(result.quest);
        setViewState('questProgress');
      } else {
        setError(result.error || 'クエストの生成に失敗しました');
      }
    } catch (error: any) {
      setError(error.message || 'クエストの生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const openPCClient = () => {
    chrome.tabs.create({ url: 'codeclimb://open' });
  };

  const handleCodeArrangementStep = async (stepId: string) => {
    setActiveStepId(stepId);
    
    try {
      // Get code blocks for the specific step
      const response = await APIManager.getStepCodeBlocks(stepId);
      if (response.success) {
        setCodeBlocks(response.data.blocks || []);
        setViewState('codeArrangement');
      } else {
        setError('コードブロックの取得に失敗しました');
      }
    } catch (error: any) {
      setError(error.message || 'コードブロックの取得に失敗しました');
    }
  };

  const handleCodeArrangementSubmit = async (arrangement: string[]) => {
    try {
      const response = await APIManager.submitCodeArrangement(activeStepId, arrangement);
      
      if (response.success) {
        // Update step completion status
        if (currentQuest) {
          const updatedQuest = {
            ...currentQuest,
            steps: currentQuest.steps.map(step => 
              step.id === activeStepId 
                ? { ...step, isCompleted: true }
                : step
            )
          };
          setCurrentQuest(updatedQuest);
          
          // Check if quest is completed
          const allCompleted = updatedQuest.steps.every(step => step.isCompleted);
          if (allCompleted) {
            setQuestCompleted(true);
          }
        }
        
        setViewState('questProgress');
      }
    } catch (error: any) {
      setError(error.message || 'コード並べ替えの提出に失敗しました');
    }
  };

  const handleCodeArrangementComplete = () => {
    setViewState('questProgress');
  };

  const handleSummitRecorded = (summitId: string) => {
    // Navigate to portfolio or show success message
    chrome.tabs.create({ url: `codeclimb://portfolio/${summitId}` });
  };

  const showImplementationGallery = () => {
    setViewState('implementationGallery');
  };

  if (viewState === 'loading') {
    return (
      <div className="p-6 text-center">
        <div className="spinner w-8 h-8 mx-auto mb-4"></div>
        <p className="text-slate-600">読み込み中...</p>
      </div>
    );
  }

  if (viewState === 'login') {
    return (
      <div className="p-6 max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-900 mb-2">CodeClimb</h1>
          <p className="text-sm text-slate-600">ログインして学習を始めましょう</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="メールアドレス"
              className="input"
              value={loginForm.email}
              onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="パスワード"
              className="input"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            ログイン
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={openPCClient}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            PCアプリでアカウントを作成
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'projectSelect') {
    return (
      <div className="p-6 max-w-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">プロジェクト選択</h2>
          <p className="text-sm text-slate-600">クエストを生成するプロジェクトを選択してください</p>
        </div>

        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className="w-full text-left p-3 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <h3 className="font-medium text-slate-900">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-slate-600 mt-1">{project.description}</p>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={openPCClient}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            新しいプロジェクトを作成
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'questGenerate') {
    return (
      <div className="p-6 max-w-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">クエスト生成</h2>
          <p className="text-xs text-slate-500 mb-3">プロジェクト: {activeProject?.name}</p>
          {currentTab?.title && (
            <p className="text-sm text-slate-600 line-clamp-2">{currentTab.title}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleQuestGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              実装したいこと
            </label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="例: React Hooksを使ったカウンター機能"
              value={questForm.implementationGoal}
              onChange={(e) => setQuestForm(prev => ({ ...prev, implementationGoal: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              難易度
            </label>
            <select
              className="select"
              value={questForm.difficulty}
              onChange={(e) => setQuestForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
            >
              <option value="EASY">初級</option>
              <option value="MEDIUM">中級</option>
              <option value="HARD">上級</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="btn-primary w-full"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <div className="spinner w-4 h-4 mr-2"></div>
                生成中...
              </span>
            ) : (
              'クエストを生成'
            )}
          </button>
        </form>

        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => setViewState('projectSelect')}
            className="btn-ghost flex-1 text-sm"
          >
            プロジェクト変更
          </button>
          <button
            onClick={openPCClient}
            className="btn-secondary flex-1 text-sm"
          >
            PCアプリで開く
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'questProgress' && currentQuest) {
    const completedSteps = currentQuest.steps.filter(step => step.isCompleted).length;
    const progressPercentage = (completedSteps / currentQuest.steps.length) * 100;

    return (
      <div className="p-6 max-w-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">{currentQuest.title}</h2>
          <p className="text-sm text-slate-600 mb-4">{currentQuest.description}</p>
          
          <div className="progress-bar mb-2">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500">
            {completedSteps} / {currentQuest.steps.length} ステップ完了
          </p>
        </div>

        <div className="space-y-3">
          {currentQuest.steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-3 rounded-lg border ${
                step.isCompleted
                  ? 'bg-success-50 border-success-200'
                  : index === completedSteps
                  ? 'bg-primary-50 border-primary-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  step.isCompleted ? 'text-success-800' : 'text-slate-800'
                }`}>
                  {step.isCompleted ? '✅' : index === completedSteps ? '⚡' : '⏸️'} {step.title}
                </span>
                {step.type === 'ARRANGE_CODE' && !step.isCompleted && index === completedSteps && (
                  <button
                    onClick={() => handleCodeArrangementStep(step.id)}
                    className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded hover:bg-primary-200"
                  >
                    並べ替え
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Summit Record Button - only show when quest is completed */}
        {questCompleted && currentQuest && (
          <div className="mt-4">
            <SummitRecordButton
              questId={currentQuest.id}
              isCompleted={questCompleted}
              onSummitRecorded={handleSummitRecorded}
            />
          </div>
        )}

        <div className="mt-6 flex space-x-2">
          <button
            onClick={() => setViewState('questGenerate')}
            className="btn-ghost flex-1 text-sm"
          >
            新しいクエスト
          </button>
          <button
            onClick={showImplementationGallery}
            className="btn-secondary flex-1 text-sm"
          >
            他の実装を見る
          </button>
          <button
            onClick={openPCClient}
            className="btn-primary flex-1 text-sm"
          >
            PCで続行
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'codeArrangement' && codeBlocks.length > 0) {
    return (
      <div className="p-6 max-w-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 mb-2">コード並べ替えパズル</h2>
          <p className="text-sm text-slate-600">
            正しい実行順序になるようにコードブロックを並べ替えてください
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <CodeArrangement
          blocks={codeBlocks}
          onSubmit={handleCodeArrangementSubmit}
          onComplete={handleCodeArrangementComplete}
          hint="実行の順序を考えて、変数の宣言から使用まで正しい流れにしましょう"
        />

        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => setViewState('questProgress')}
            className="btn-ghost flex-1 text-sm"
          >
            クエストに戻る
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'implementationGallery' && currentTab?.url) {
    return (
      <div className="p-6 max-w-sm">
        <div className="mb-4">
          <button
            onClick={() => setViewState('questProgress')}
            className="flex items-center text-slate-600 hover:text-slate-800 mb-3"
          >
            ← クエストに戻る
          </button>
        </div>

        <ImplementationGallery
          articleUrl={currentTab.url}
          currentImplementation={undefined}
        />
      </div>
    );
  }

  return null;
}

export default App;