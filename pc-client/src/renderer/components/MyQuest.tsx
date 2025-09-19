import React, { useState, useEffect } from 'react'
import QuestService, { Quest, QuestStats } from '../services/quest.service'

type QuestFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'paused'
type QuestView = 'list' | 'detail'

const MyQuest: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([])
  const [filteredQuests, setFilteredQuests] = useState<Quest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<QuestFilter>('all')
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [currentView, setCurrentView] = useState<QuestView>('list')
  const [stats, setStats] = useState<QuestStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    paused: 0,
    totalTimeSpent: 0,
    averageCompletionTime: 0,
    completionRate: 0,
    streak: 0,
    favoriteCategory: '',
    recentCompletions: []
  })

  // Load quests on component mount
  useEffect(() => {
    loadQuests()
    loadStats()
  }, [])

  // Filter quests when filter changes
  useEffect(() => {
    filterQuests()
  }, [quests, activeFilter])

  const loadQuests = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const questData = await QuestService.getUserQuests()
      setQuests(questData)
    } catch (error) {
      console.error('Failed to load quests:', error)
      setError('クエストの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const questStats = await QuestService.getQuestStats()
      setStats(questStats)
    } catch (error) {
      console.error('Failed to load quest stats:', error)
    }
  }

  const filterQuests = () => {
    let filtered = quests

    switch (activeFilter) {
      case 'pending':
        filtered = quests.filter(quest => quest.status === 'PENDING')
        break
      case 'in_progress':
        filtered = quests.filter(quest => quest.status === 'IN_PROGRESS')
        break
      case 'completed':
        filtered = quests.filter(quest => quest.status === 'COMPLETED')
        break
      case 'paused':
        filtered = quests.filter(quest => quest.status === 'PAUSED')
        break
      default:
        filtered = quests
    }

    setFilteredQuests(filtered)
  }

  const handleQuestClick = (quest: Quest) => {
    setSelectedQuest(quest)
    setCurrentView('detail')
  }

  const handleBackToList = () => {
    setSelectedQuest(null)
    setCurrentView('list')
  }

  const refreshQuests = async () => {
    await loadQuests()
    await loadStats()
  }

  const handleStartQuest = async (questId: string) => {
    try {
      await QuestService.startQuest(questId)
      await refreshQuests()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'クエストの開始に失敗しました')
    }
  }

  const handlePauseQuest = async (questId: string) => {
    try {
      await QuestService.pauseQuest(questId)
      await refreshQuests()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'クエストの一時停止に失敗しました')
    }
  }

  const handleResumeQuest = async (questId: string) => {
    try {
      await QuestService.resumeQuest(questId)
      await refreshQuests()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'クエストの再開に失敗しました')
    }
  }

  const getFilterLabel = (filter: QuestFilter) => {
    switch (filter) {
      case 'all': return 'すべて'
      case 'pending': return '未開始'
      case 'in_progress': return '進行中'
      case 'completed': return '完了済み'
      case 'paused': return '一時停止'
      default: return filter
    }
  }

  const getFilterCount = (filter: QuestFilter) => {
    switch (filter) {
      case 'all': return stats.total
      case 'pending': return stats.pending
      case 'in_progress': return stats.inProgress
      case 'completed': return stats.completed
      case 'paused': return stats.paused
      default: return 0
    }
  }

  const getProgressPercentage = (quest: Quest) => {
    return quest.progress.totalSteps > 0
      ? Math.round((quest.progress.completedSteps / quest.progress.totalSteps) * 100)
      : 0
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (currentView === 'detail' && selectedQuest) {
    return (
      <div className="h-full bg-gray-50 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToList}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                ← 戻る
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedQuest.title}</h1>
                <p className="text-gray-600 mt-1">{selectedQuest.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${QuestService.getDifficultyColor(selectedQuest.difficulty)}`}>
                {selectedQuest.difficulty}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${QuestService.getStatusColor(selectedQuest.status)}`}>
                {selectedQuest.status}
              </span>
            </div>
          </div>
        </div>

        {/* Quest Details */}
        <div className="p-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedQuest.progress.completedSteps}</div>
                <div className="text-sm text-gray-500">完了ステップ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{selectedQuest.progress.totalSteps}</div>
                <div className="text-sm text-gray-500">総ステップ数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{getProgressPercentage(selectedQuest)}%</div>
                <div className="text-sm text-gray-500">進捗率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {QuestService.formatDuration(selectedQuest.progress.timeSpent)}
                </div>
                <div className="text-sm text-gray-500">所要時間</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage(selectedQuest)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quest Steps */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">クエストステップ</h3>
            <div className="space-y-4">
              {selectedQuest.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`border rounded-lg p-4 ${
                    step.isCompleted
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          step.isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {step.isCompleted ? '✓' : index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{step.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        </div>
                      </div>

                      {/* Step metadata */}
                      <div className="ml-11 mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span>タイプ: {step.type}</span>
                        {step.timeSpent > 0 && (
                          <span>時間: {QuestService.formatDuration(step.timeSpent)}</span>
                        )}
                        {step.completedAt && (
                          <span>完了: {formatDate(step.completedAt)}</span>
                        )}
                      </div>

                      {/* Hints */}
                      {step.hints.length > 0 && (
                        <div className="ml-11 mt-3">
                          <details className="group">
                            <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                              ヒントを表示 ({step.hints.length}個)
                            </summary>
                            <div className="mt-2 space-y-1">
                              {step.hints.map((hint, hintIndex) => (
                                <div key={hintIndex} className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                                  💡 {hint}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quest Actions */}
          <div className="mt-6 flex justify-center space-x-4">
            {selectedQuest.status === 'PENDING' && (
              <button
                onClick={() => handleStartQuest(selectedQuest.id)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                クエストを開始
              </button>
            )}
            {selectedQuest.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handlePauseQuest(selectedQuest.id)}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                一時停止
              </button>
            )}
            {selectedQuest.status === 'PAUSED' && (
              <button
                onClick={() => handleResumeQuest(selectedQuest.id)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                再開
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">マイクエスト</h1>
            <p className="text-gray-600 mt-1">あなたの学習クエストを管理しましょう</p>
          </div>
          <button
            onClick={refreshQuests}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? '更新中...' : '更新'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">総クエスト数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">完了済み</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-500">進行中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(stats.completionRate)}%</div>
            <div className="text-sm text-gray-500">完了率</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.streak}</div>
            <div className="text-sm text-gray-500">連続日数</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex space-x-1">
          {(['all', 'pending', 'in_progress', 'completed', 'paused'] as QuestFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {getFilterLabel(filter)} ({getFilterCount(filter)})
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-800"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Quest List */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">クエストを読み込み中...</p>
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeFilter === 'all' ? 'クエストがありません' : `${getFilterLabel(activeFilter)}のクエストがありません`}
            </h3>
            <p className="text-gray-600">
              Chrome拡張機能を使って記事からクエストを生成してください
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredQuests.map((quest) => (
              <div
                key={quest.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => handleQuestClick(quest)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{quest.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${QuestService.getDifficultyColor(quest.difficulty)}`}>
                        {quest.difficulty}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${QuestService.getStatusColor(quest.status)}`}>
                        {quest.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{quest.description}</p>

                    {/* Progress */}
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>進捗: {quest.progress.completedSteps}/{quest.progress.totalSteps}</span>
                          <span>{getProgressPercentage(quest)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(quest)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>プロジェクト: {quest.project.name}</span>
                      <span>所要時間: {QuestService.formatDuration(quest.progress.timeSpent)}</span>
                      <span>更新: {formatDate(quest.updatedAt)}</span>
                    </div>

                    {/* Tags */}
                    {quest.tags.length > 0 && (
                      <div className="flex items-center space-x-2 mt-3">
                        {quest.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <button className="text-gray-400 hover:text-gray-600">
                      →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyQuest