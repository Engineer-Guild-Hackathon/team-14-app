import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { CodeArrangement } from '../components/CodeArrangement';
import { OutputVerification } from '../components/OutputVerification';

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
    hint?: string;
    expectedCode?: string;
    filePath?: string;
    expectedOutput?: string;
    codeBlocks?: Array<{
      id: string;
      content: string;
      order: number;
    }>;
  }>;
}

export const QuestDetails: React.FC = () => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();
  const { activeProject, openProject, projects } = useProject();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showExpected, setShowExpected] = useState(false);

  useEffect(() => {
    if (!questId) {
      navigate('/dashboard');
      return;
    }
    fetchQuestDetails();
  }, [questId]);

  const fetchQuestDetails = async () => {
    if (!questId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching quest details for:', questId);
      const response = await window.electronAPI.api.request({
        method: 'GET',
        url: `http://localhost:3000/api/quests/${questId}`
      });

      console.log('Quest details response:', response);

      if (response.success && response.data) {
        const questData = response.data.quest || response.data;
        setQuest(questData);
        
        // Find the first uncompleted step (デバッグ用：常に最初のステップから開始)
        console.log('All quest steps:', questData.steps);
        questData.steps.forEach((step: any, index: number) => {
          console.log(`Step ${index}:`, {
            type: step.type,
            title: step.title,
            hasCodeBlocks: !!step.codeBlocks,
            codeBlocksLength: step.codeBlocks?.length || 0
          });
        });
        const uncompletedStep = questData.steps.findIndex((step: any) => !step.isCompleted);
        console.log('First uncompleted step index:', uncompletedStep);
        // 常に最初のステップから開始（デバッグ用）
        setCurrentStep(0);
        
        // Ensure the project is set up
        await ensureProjectSetup(questData.project.id);
      } else {
        setError('Failed to load quest details');
      }
    } catch (err: any) {
      console.error('Error fetching quest details:', err);
      setError(err.message || 'Failed to load quest details');
    } finally {
      setIsLoading(false);
    }
  };

  const ensureProjectSetup = async (projectId: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    if (targetProject && activeProject?.id !== targetProject.id) {
      console.log('Setting up project for quest:', targetProject.name);
      openProject(targetProject);
      
      // Start file watching for this project
      try {
        await window.electronAPI.projects.startWatching({
          projectId: targetProject.id,
          projectPath: targetProject.localPath || '',
          userId: targetProject.id 
        });
      } catch (error) {
        console.warn('Failed to start file watching:', error);
      }
    }
  };

  const handleStepComplete = async (stepId: string) => {
    if (!quest) return;

    try {
      // Mark step as completed
      const response = await window.electronAPI.api.request({
        method: 'PUT',
        url: `http://localhost:3000/api/quests/${questId}/progress`,
        data: {
          stepId,
          completed: true
        }
      });

      if (response.success) {
        // Update local state
        setQuest(prev => {
          if (!prev) return null;
          
          const updatedSteps = prev.steps.map(step => 
            step.id === stepId ? { ...step, isCompleted: true } : step
          );
          
          const completedCount = updatedSteps.filter(step => step.isCompleted).length;
          
          return {
            ...prev,
            steps: updatedSteps,
            progress: {
              ...prev.progress,
              completedSteps: completedCount
            }
          };
        });

        // Auto-advance to next step if available
        const nextStepIndex = currentStep + 1;
        if (nextStepIndex < quest.steps.length) {
          setCurrentStep(nextStepIndex);
        }
      }
    } catch (error) {
      console.error('Failed to update quest progress:', error);
    }
  };

  const handleStepSelect = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleNextStep = () => {
    if (quest && currentStep < quest.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HARD': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'ARRANGE_CODE': return '🧩';
      case 'IMPLEMENT_CODE': return '💻';
      case 'VERIFY_OUTPUT': return '🏁';
      default: return '📝';
    }
  };

  const renderStepContent = () => {
    if (!quest) return null;
    
    const currentStepData = quest.steps[currentStep];
    
    // デバッグ情報
    console.log('Current step data:', currentStepData);
    console.log('Step type:', currentStepData.type);
    console.log('Code blocks:', currentStepData.codeBlocks);
    
    // 全ステップが完了しているかチェック
    const allStepsCompleted = quest.steps.every(step => step.isCompleted);
    
    // 全ステップ完了後は実装フェーズ
    if (allStepsCompleted) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              学習完了！実際にコードを実装しましょう
            </h2>
            <p className="text-gray-600 mb-6">
              コードブロックの理解ができました。<br />
              次は、あなたのプロジェクトディレクトリで実際にSwiftコードを書いてみましょう。
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">📁 実装手順</h3>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <h4 className="font-medium text-gray-900">Chartsライブラリのimportを追加</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">既存のContentView.swiftに「import Charts」を追加してください</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-900 mb-1">編集するファイル:</div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">ContentView.swift</code>
                  <p className="text-sm text-yellow-700 mt-2">
                    「import SwiftUI」の下に「import Charts」を追加してください
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <h4 className="font-medium text-gray-900">Chart機能をVStackに追加</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">既存のVStackの中にChart機能を追加してください</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-900 mb-1">編集するファイル:</div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">ContentView.swift</code>
                  <p className="text-sm text-yellow-700 mt-2">
                    Text("Hello, world!")の下にChart機能を追加してください
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <h4 className="font-medium text-gray-900">UIを整えて完成</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">ImageアイコンとTextをChart仕様に変更してUIを完成させてください</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-900 mb-1">編集するファイル:</div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">ContentView.swift</code>
                  <p className="text-sm text-yellow-700 mt-2">
                    ImageをChart関連のアイコンに、TextをChart説明に変更してください
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* ヒント機能 */}
          <div className="mb-6">
            <button
              onClick={() => setShowHint(!showHint)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-yellow-800 transition-colors"
            >
              💡 完全なコード例が必要ですか？
              <span className={`transition-transform ${showHint ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showHint && (
              <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">💡 実装のヒント - 完全なコード例</span>
                </div>
                <div className="p-4 space-y-4">
                  {quest.steps.map((step, index) => (
                    <div key={step.id} className="border-l-4 border-blue-200 pl-4">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        Step {index + 1}: {step.title}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-2">期待されるSwiftコード（ContentView.swift）:</div>
                        <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto">
                          {index === 0 ? `//
//  ContentView.swift
//  EGH_Test_App
//
//  Created by 保坂篤志 on 2025/09/13.
//

import SwiftUI
import Charts

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, world!")
        }
        .padding()
    }
}

#Preview {
    ContentView()
}` : 
index === 1 ? `//
//  ContentView.swift
//  EGH_Test_App
//
//  Created by 保坂篤志 on 2025/09/13.
//

import SwiftUI
import Charts

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, world!")
            
            Chart {
                BarMark(x: .value("Day", "Mon"), y: .value("Sales", 5))
                BarMark(x: .value("Day", "Tue"), y: .value("Sales", 8))
                BarMark(x: .value("Day", "Wed"), y: .value("Sales", 3))
                BarMark(x: .value("Day", "Thu"), y: .value("Sales", 12))
                BarMark(x: .value("Day", "Fri"), y: .value("Sales", 7))
            }
            .frame(height: 200)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}` : `//
//  ContentView.swift
//  EGH_Test_App  
//
//  Created by 保坂篤志 on 2025/09/13.
//

import SwiftUI
import Charts

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "chart.bar.fill")
                .imageScale(.large)
                .foregroundStyle(.blue)
            Text("Sales Chart")
            
            Chart {
                BarMark(x: .value("Day", "Mon"), y: .value("Sales", 5))
                BarMark(x: .value("Day", "Tue"), y: .value("Sales", 8))
                BarMark(x: .value("Day", "Wed"), y: .value("Sales", 3))
                BarMark(x: .value("Day", "Thu"), y: .value("Sales", 12))
                BarMark(x: .value("Day", "Fri"), y: .value("Sales", 7))
            }
            .frame(height: 200)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}`}
                        </pre>
                      </div>
                      {step.hint && (
                        <div className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                          <span className="font-medium">💭 ヒント: </span>
                          {step.hint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">👀</div>
            <div className="text-lg font-medium text-green-800 mb-2">PCクライアントが監視中</div>
            <div className="text-sm text-green-700">
              上記のファイルを編集すると、自動で実装状況をチェックします。<br />
              正しい実装が完了するとクエストクリアになります！
            </div>
          </div>
        </div>
      );
    }
    
    switch (currentStepData.type) {
      case 'ARRANGE_CODE':
        return (
          <CodeArrangement
            blocks={currentStepData.codeBlocks || []}
            onSubmit={(arrangement) => {
              console.log('Code arrangement submitted:', arrangement);
              handleStepComplete(currentStepData.id);
            }}
            hint={currentStepData.hint}
            isCompleted={currentStepData.isCompleted}
          />
        );
        
      // テスト用：全てのIMPLEMENT_CODEステップでブロック並び替えを表示
      case 'IMPLEMENT_CODE':
        // ステップごとに異なるコードブロックを用意
        let testBlocks;
        let hint;
        
        switch (currentStep) {
          case 0:
            testBlocks = [
              { id: '1', content: 'import SwiftUI', order: 1 },
              { id: '2', content: 'import Charts', order: 2 },
              { id: '3', content: '', order: 3 },
              { id: '4', content: 'struct ContentView: View {', order: 4 }
            ];
            hint = "既存のContentViewにChartsライブラリを追加するためのimport順序を理解しましょう";
            break;
            
          case 1:
            testBlocks = [
              { id: '1', content: 'VStack {', order: 1 },
              { id: '2', content: '    Chart {', order: 2 },
              { id: '3', content: '        BarMark(x: .value("Day", "Mon"), y: .value("Sales", 5))', order: 3 },
              { id: '4', content: '        BarMark(x: .value("Day", "Tue"), y: .value("Sales", 8))', order: 4 },
              { id: '5', content: '    }', order: 5 },
              { id: '6', content: '    .frame(height: 200)', order: 6 }
            ];
            hint = "既存のVStackの中にChart機能を追加する構造を理解しましょう";
            break;
            
          case 2:
            testBlocks = [
              { id: '1', content: 'Image(systemName: "globe")', order: 1 },
              { id: '2', content: '    .imageScale(.large)', order: 2 },
              { id: '3', content: '    .foregroundStyle(.tint)', order: 3 },
              { id: '4', content: 'Text("Hello, world!")', order: 4 },
              { id: '5', content: 'Chart { ... }', order: 5 },
              { id: '6', content: '    .frame(height: 200)', order: 6 }
            ];
            hint = "既存のコンテンツ（Image、Text）とChartの組み合わせ順序を理解しましょう";
            break;
            
          default:
            testBlocks = [
              { id: '1', content: 'print("Hello")', order: 1 },
              { id: '2', content: 'print("World")', order: 2 }
            ];
            hint = "コードの実行順序を理解しましょう";
        }
        
        return (
          <CodeArrangement
            blocks={testBlocks}
            onSubmit={(arrangement) => {
              console.log(`Step ${currentStep} code arrangement submitted:`, arrangement);
              handleStepComplete(currentStepData.id);
            }}
            hint={hint}
            isCompleted={currentStepData.isCompleted}
          />
        );
        
      case 'VERIFY_OUTPUT':
        return (
          <OutputVerification
            instruction={currentStepData.description}
            expectedOutput={currentStepData.expectedOutput}
            filePath={currentStepData.filePath}
            onSubmit={(output) => {
              console.log('Output verification submitted:', output);
              handleStepComplete(currentStepData.id);
            }}
            hint={currentStepData.hint}
            isCompleted={currentStepData.isCompleted}
          />
        );
        
      default:
        return (
          <div className="text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">🚧</div>
            <div>Unknown step type: {currentStepData.type}</div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl animate-bounce">🏔️</div>
          <div className="text-lg text-gray-600">クエスト詳細を読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-6xl mb-4">😵</div>
        <div className="text-red-600 text-lg mb-4">{error}</div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← ダッシュボードに戻る
        </button>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-6xl mb-4">🤷</div>
        <div className="text-lg mb-4 text-gray-600">クエストが見つかりません</div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← ダッシュボードに戻る
        </button>
      </div>
    );
  }

  const currentStepData = quest.steps[currentStep];

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar - Quest Info & Steps */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        {/* Quest Header */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-800 text-sm mb-4 flex items-center gap-1"
          >
            ← ダッシュボード
          </button>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏔️</span>
            <h1 className="text-lg font-bold text-gray-900">{quest.title}</h1>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quest.difficulty)}`}>
              {quest.difficulty}
            </span>
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              {quest.progress.completedSteps}/{quest.progress.totalSteps} 完了
            </span>
          </div>
          <p className="text-gray-600 text-sm">{quest.description}</p>
        </div>

        {/* Steps Progress */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">📋 ステップ</h3>
            <div className="space-y-2">
              {quest.steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => handleStepSelect(index)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    index === currentStep
                      ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                      : step.isCompleted
                      ? 'border-green-200 bg-green-50 text-green-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStepTypeIcon(step.type)}</span>
                      <span className="text-sm font-medium">
                        Step {step.stepNumber}
                      </span>
                    </div>
                    {step.isCompleted && (
                      <span className="text-green-600 text-lg">✅</span>
                    )}
                  </div>
                  <div className="text-sm font-medium mb-1">{step.title}</div>
                  <div className="text-xs text-gray-500">
                    {step.type === 'ARRANGE_CODE' && '🧩 コードブロック並び替え'}
                    {step.type === 'IMPLEMENT_CODE' && '💻 コード実装'}
                    {step.type === 'VERIFY_OUTPUT' && '🏁 出力確認'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm">
            <div className="font-medium text-gray-900 mb-1">📁 プロジェクト</div>
            <div className="text-gray-700">{quest.project.name}</div>
            {activeProject?.id === quest.project.id ? (
              <div className="text-green-600 text-xs mt-1 flex items-center gap-1">
                <span>✅</span> アクティブ・監視中
              </div>
            ) : (
              <div className="text-yellow-600 text-xs mt-1 flex items-center gap-1">
                <span>⚙️</span> セットアップ中...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Step Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getStepTypeIcon(currentStepData.type)}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Step {currentStepData.stepNumber}: {currentStepData.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {currentStepData.isCompleted && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    ✅ 完了済み
                  </span>
                )}
                <span className="text-sm text-gray-600">
                  {currentStep + 1} / {quest.steps.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Learning Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {renderStepContent()}
        </div>

        {/* Navigation Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePreviousStep}
              disabled={currentStep === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← 前のステップ
            </button>
            
            <div className="text-sm text-gray-600">
              {currentStepData.isCompleted ? (
                <span className="text-green-600 font-medium">✅ このステップは完了済み</span>
              ) : (
                <span>上記の学習を完了すると自動で次に進みます</span>
              )}
            </div>
            
            <button
              onClick={handleNextStep}
              disabled={currentStep === quest.steps.length - 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              次のステップ →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};