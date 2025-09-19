import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface Quest {
  id: string;
  name: string;
  relatedArticle: {
    title: string;
    url: string;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  challengingStudentCount: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
}

interface QuestFilters {
  searchQuery: string;
  difficultyFilter: 'all' | 'beginner' | 'intermediate' | 'advanced';
}

interface AssignmentModal {
  selectedQuest: Quest | null;
  assignmentType: 'individual' | 'group';
  targetStudents: string[];
  targetGroups: string[];
  isOpen: boolean;
}

const QuestManagement: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState({
    quests: true,
    students: true,
    groups: true
  });
  const [filters, setFilters] = useState<QuestFilters>({
    searchQuery: '',
    difficultyFilter: 'all'
  });
  const [assignmentModal, setAssignmentModal] = useState<AssignmentModal>({
    selectedQuest: null,
    assignmentType: 'individual',
    targetStudents: [],
    targetGroups: [],
    isOpen: false
  });
  const [selectedQuests, setSelectedQuests] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuests();
    fetchStudents();
    fetchGroups();
  }, []);

  const fetchQuests = async () => {
    try {
      setLoading(prev => ({ ...prev, quests: true }));
      const response = await api.get('/teacher/quests');

      if (response.data.success) {
        setQuests(response.data.data || []);
      } else {
        setError('クエストデータの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'クエストデータの取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, quests: false }));
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(prev => ({ ...prev, students: true }));
      const response = await api.get('/teacher/students');

      if (response.data.success) {
        setStudents(response.data.data || []);
      } else {
        setError('生徒データの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '生徒データの取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, students: false }));
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(prev => ({ ...prev, groups: true }));
      const response = await api.get('/teacher/groups');

      if (response.data.success) {
        setGroups(response.data.data || []);
      } else {
        setError('グループデータの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'グループデータの取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, groups: false }));
    }
  };

  const openAssignmentModal = (quest: Quest) => {
    setAssignmentModal({
      selectedQuest: quest,
      assignmentType: 'individual',
      targetStudents: [],
      targetGroups: [],
      isOpen: true
    });
  };

  const closeAssignmentModal = () => {
    setAssignmentModal({
      selectedQuest: null,
      assignmentType: 'individual',
      targetStudents: [],
      targetGroups: [],
      isOpen: false
    });
  };

  const assignQuestToStudent = async (questId: string, studentId: string) => {
    try {
      const response = await api.post('/teacher/assignments', {
        questId,
        studentId,
        type: 'individual'
      });

      if (response.data.success) {
        alert('クエストを生徒に割り当てました');
      } else {
        alert('割り当てに失敗しました');
      }
    } catch (error: any) {
      alert('割り当てに失敗しました: ' + error.message);
    }
  };

  const assignQuestToGroup = async (questId: string, groupId: string) => {
    try {
      const response = await api.post('/teacher/assignments', {
        questId,
        groupId,
        type: 'group'
      });

      if (response.data.success) {
        alert('クエストをグループに割り当てました');
      } else {
        alert('割り当てに失敗しました');
      }
    } catch (error: any) {
      alert('割り当てに失敗しました: ' + error.message);
    }
  };

  const bulkAssignQuest = async () => {
    if (!assignmentModal.selectedQuest) return;

    try {
      const questId = assignmentModal.selectedQuest.id;

      if (assignmentModal.assignmentType === 'individual') {
        for (const studentId of assignmentModal.targetStudents) {
          await assignQuestToStudent(questId, studentId);
        }
      } else {
        for (const groupId of assignmentModal.targetGroups) {
          await assignQuestToGroup(questId, groupId);
        }
      }

      closeAssignmentModal();
      alert('クエストの割り当てが完了しました');
    } catch (error: any) {
      alert('割り当てに失敗しました: ' + error.message);
    }
  };

  const selectQuest = (questId: string) => {
    setSelectedQuests(prev =>
      prev.includes(questId)
        ? prev.filter(id => id !== questId)
        : [...prev, questId]
    );
  };

  const filteredQuests = quests.filter(quest => {
    const matchesSearch = quest.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                         quest.relatedArticle.title.toLowerCase().includes(filters.searchQuery.toLowerCase());
    const matchesDifficulty = filters.difficultyFilter === 'all' || quest.difficulty === filters.difficultyFilter;

    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyBadge = (difficulty: Quest['difficulty']) => {
    const difficultyConfig = {
      beginner: { label: '初級', className: 'bg-green-100 text-green-800' },
      intermediate: { label: '中級', className: 'bg-yellow-100 text-yellow-800' },
      advanced: { label: '上級', className: 'bg-red-100 text-red-800' }
    };

    const config = difficultyConfig[difficulty];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-semibold mb-2">エラーが発生しました</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex space-x-2">
          <button
            onClick={fetchQuests}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            クエスト再読み込み
          </button>
          <button
            onClick={fetchStudents}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            生徒再読み込み
          </button>
          <button
            onClick={fetchGroups}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            グループ再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quest-management p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">クエスト管理</h1>
        <p className="text-gray-600">クエストの一覧表示と生徒・グループへの割り当て</p>
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                placeholder="クエスト名で検索"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              />
            </div>
            <div>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.difficultyFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, difficultyFilter: e.target.value as any }))}
              >
                <option value="all">全ての難易度</option>
                <option value="beginner">初級</option>
                <option value="intermediate">中級</option>
                <option value="advanced">上級</option>
              </select>
            </div>
            <div>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.statusFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value as any }))}
              >
                <option value="all">全ての状況</option>
                <option value="active">活動中</option>
                <option value="completed">完了済み</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* クエスト一覧 */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">クエスト一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  選択
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  クエスト名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  関連技術記事
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  難易度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  挑戦中の生徒数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading.quests ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredQuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    条件に一致するクエストが見つかりません
                  </td>
                </tr>
              ) : (
                filteredQuests.map(quest => (
                  <tr key={quest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedQuests.includes(quest.id)}
                        onChange={() => selectQuest(quest.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{quest.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={quest.relatedArticle.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        {quest.relatedArticle.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDifficultyBadge(quest.difficulty)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quest.challengingStudentCount}人
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openAssignmentModal(quest)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        割り当て
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 課題割り当てモーダル */}
      {assignmentModal.isOpen && assignmentModal.selectedQuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">課題割り当て</h3>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">{assignmentModal.selectedQuest.name}</h4>
              <p className="text-sm text-gray-600">このクエストを生徒またはグループに割り当てます</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">割り当て方法</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={assignmentModal.assignmentType}
                onChange={(e) => setAssignmentModal(prev => ({ ...prev, assignmentType: e.target.value as 'individual' | 'group' }))}
              >
                <option value="individual">個人割り当て</option>
                <option value="group">グループ割り当て</option>
              </select>
            </div>

            {assignmentModal.assignmentType === 'individual' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">対象生徒</label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {students.map(student => (
                    <label key={student.id} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={assignmentModal.targetStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignmentModal(prev => ({
                              ...prev,
                              targetStudents: [...prev.targetStudents, student.id]
                            }));
                          } else {
                            setAssignmentModal(prev => ({
                              ...prev,
                              targetStudents: prev.targetStudents.filter(id => id !== student.id)
                            }));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm">{student.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">対象グループ</label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {groups.map(group => (
                    <label key={group.id} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={assignmentModal.targetGroups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignmentModal(prev => ({
                              ...prev,
                              targetGroups: [...prev.targetGroups, group.id]
                            }));
                          } else {
                            setAssignmentModal(prev => ({
                              ...prev,
                              targetGroups: prev.targetGroups.filter(id => id !== group.id)
                            }));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm">{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2 mt-6">
              <button
                onClick={closeAssignmentModal}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
              <button
                onClick={bulkAssignQuest}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={
                  assignmentModal.assignmentType === 'individual'
                    ? assignmentModal.targetStudents.length === 0
                    : assignmentModal.targetGroups.length === 0
                }
              >
                割り当て実行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestManagement;