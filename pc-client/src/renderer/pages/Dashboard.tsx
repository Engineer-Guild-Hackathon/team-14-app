import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useProjectStore } from '../stores/projectStore'
import SkillMap3D from '../components/SkillMap3D'
import MyQuest from '../components/MyQuest'
import '../styles/SkillMap3D.css'

type ActiveView = 'dashboard' | 'my-quest' | 'activity' | 'my-rate' | 'leaderboard' | 'roadmap';

const Dashboard: React.FC = () => {
  const { user, logout, isWebSocketConnected, extensionStatus, syncWithExtension } = useAuthStore()
  const {
    projects,
    currentProject,
    isLoading,
    error,
    addProject,
    removeProject,
    setCurrentProject,
    selectDirectory,
    clearError
  } = useProjectStore()

  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [selectedPath, setSelectedPath] = useState('')

  useEffect(() => {
    // エラーを自動的にクリア（5秒後）
    if (error) {
      const timer = setTimeout(() => {
        clearError()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  const handleAddProject = async () => {
    try {
      const path = await selectDirectory()
      if (path) {
        setSelectedPath(path)
        setNewProjectName(path.split('/').pop() || '')
        setShowAddProjectDialog(true)
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
    }
  }

  const handleConfirmAddProject = async () => {
    if (!selectedPath || !newProjectName.trim()) {
      return
    }

    try {
      await addProject(selectedPath, newProjectName.trim(), newProjectDescription.trim() || undefined)
      setShowAddProjectDialog(false)
      setNewProjectName('')
      setNewProjectDescription('')
      setSelectedPath('')
    } catch (error) {
      console.error('Failed to add project:', error)
    }
  }

  const handleCancelAddProject = () => {
    setShowAddProjectDialog(false)
    setNewProjectName('')
    setNewProjectDescription('')
    setSelectedPath('')
  }

  const handleRemoveProject = async (projectId: string) => {
    if (window.confirm('このプロジェクトを削除しますか？')) {
      try {
        await removeProject(projectId)
      } catch (error) {
        console.error('Failed to remove project:', error)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* サイドバー */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* ロゴ */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              CC
            </div>
            <span className="text-xl font-bold text-gray-900">CodeClimb</span>
          </div>
        </div>

        {/* ナビゲーション */}
        <div className="flex-1 p-6">
          {/* Quest セクション */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quest</h3>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('my-quest')}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'my-quest'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                My Quest
              </button>
              <button
                onClick={() => setActiveView('activity')}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'activity'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Activity
              </button>
            </nav>
          </div>

          {/* Ranking セクション */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ranking</h3>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveView('my-rate')}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'my-rate'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                My Rate
              </button>
              <button
                onClick={() => setActiveView('roadmap')}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'roadmap'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Roadmap
              </button>
              <button
                onClick={() => setActiveView('leaderboard')}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'leaderboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Growth
              </button>
            </nav>
          </div>
        </div>

        {/* ユーザー情報 */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            サインアウト
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <div className="h-full p-8 overflow-auto">
            {/* エラー表示 */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* 統計カード */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">アクティブ</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {projects.filter(p => p.questCount > 0).length}
                    </p>
                  </div>
                  <div className="text-blue-500 text-2xl">📊</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">合計</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {projects.reduce((sum, p) => sum + p.questCount, 0)}
                    </p>
                  </div>
                  <div className="text-green-500 text-2xl">✅</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">学習時間</p>
                    <p className="text-2xl font-bold text-gray-900">--時間</p>
                  </div>
                  <div className="text-purple-500 text-2xl">⏱️</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">合格率</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {projects.length > 0
                        ? Math.round((projects.reduce((sum, p) => sum + p.completedQuests, 0) / Math.max(projects.reduce((sum, p) => sum + p.questCount, 0), 1)) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-yellow-500 text-2xl">🎯</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* プロジェクト管理 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">プロジェクト</h2>
                  <button
                    onClick={handleAddProject}
                    disabled={isLoading}
                    className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-3">
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">プロジェクトがありません</p>
                      <button
                        onClick={handleAddProject}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                      >
                        プロジェクトを追加
                      </button>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          currentProject?.id === project.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCurrentProject(project)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{project.name}</h3>
                            <p className="text-sm text-gray-500 truncate">{project.path}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-gray-400">
                                クエスト: {project.completedQuests}/{project.questCount}
                              </span>
                              <span className="text-xs text-gray-400">
                                更新: {formatDate(project.lastAccessedAt)}
                              </span>
                            </div>
                            {project.questCount > 0 && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${getProgressPercentage(project.completedQuests, project.questCount)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveProject(project.id)
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* アクティビティカレンダー */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">最近のアクティビティ</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">今月の活動</h3>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 28 }, (_, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 bg-gray-200 rounded-sm"
                          title={`${new Date().getMonth() + 1}月${i + 1}日`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 取り組み中のクエスト */}
            {currentProject && (
              <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  取り組み中のクエスト - {currentProject.name}
                </h2>
                <div className="text-gray-500">
                  <p>まだクエストがありません。Chrome拡張機能を使って記事からクエストを生成してください。</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'my-quest' && (
          <div className="h-full">
            <MyQuest />
          </div>
        )}

        {activeView === 'activity' && (
          <div className="h-full p-8">
            <SkillMap3D />
          </div>
        )}

        {activeView === 'my-rate' && (
          <div className="h-full p-8 overflow-auto">
            {/* MyRate画面 */}
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">ランク</h1>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">プレイヤー</p>
                    <p className="font-semibold text-gray-900">{user?.name}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-lg">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 現在のランク表示 */}
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 text-white mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">次のランク: 桃色</h2>
                    <p className="text-lg mb-4">あと <span className="text-3xl font-bold">246</span> pt</p>
                    <div className="w-full bg-white bg-opacity-20 rounded-full h-3">
                      <div
                        className="bg-white h-3 rounded-full transition-all duration-500"
                        style={{ width: '68%' }}
                      />
                    </div>
                    <p className="text-sm mt-2 opacity-90">現在: 754 pt / 目標: 1000 pt</p>
                  </div>
                  <div className="ml-8">
                    <div className="w-32 h-32 flex items-center justify-center">
                      {/* ランクアイコン（三角形） */}
                      <div className="relative">
                        <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
                          <polygon points="60,10 110,85 10,85" fill="rgba(34, 197, 94, 0.8)" stroke="white" strokeWidth="2"/>
                          <polygon points="60,20 100,75 20,75" fill="rgba(34, 197, 94, 0.6)"/>
                          <polygon points="60,30 90,65 30,65" fill="rgba(34, 197, 94, 0.4)"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 統計情報 */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                  <div className="text-3xl mb-2">🏆</div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">完了クエスト</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                  <div className="text-3xl mb-2">🔥</div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">連続日数</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                  <div className="text-3xl mb-2">⏱️</div>
                  <p className="text-2xl font-bold text-gray-900">0分</p>
                  <p className="text-sm text-gray-500">学習時間</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                  <div className="text-3xl mb-2">📈</div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">ランキング</p>
                </div>
              </div>

              {/* ランク履歴 */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ランク履歴</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">緑色ランク獲得</p>
                      <p className="text-sm text-gray-500">最初のランクです。学習を開始しましょう！</p>
                    </div>
                    <p className="text-sm text-gray-400">今日</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'roadmap' && (
          <div className="h-full relative">
            {/* ヘッダー */}
            <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">技術マップ</h1>
                  <p className="text-gray-600 mt-1">あなたの学習分野の現在の位置がプロットされます。中心に行けば行くほど、技術力が高いことを示します</p>
                </div>
                <button className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 3D マップエリア */}
            <div className="h-full pt-24">
              <SkillMap3D />
            </div>
          </div>
        )}

        {activeView === 'leaderboard' && (
          <div className="h-full p-8 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">成長記録</h2>
              <p className="text-gray-500">この機能は開発中です</p>
            </div>
          </div>
        )}
      </div>

      {/* プロジェクト追加ダイアログ */}
      {showAddProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">プロジェクトを追加</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  フォルダパス
                </label>
                <input
                  type="text"
                  value={selectedPath}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  プロジェクト名 *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="プロジェクト名を入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明（オプション）
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="プロジェクトの説明"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelAddProject}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmAddProject}
                disabled={!newProjectName.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {isLoading ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard