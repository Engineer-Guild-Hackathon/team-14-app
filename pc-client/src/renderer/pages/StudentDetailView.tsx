import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface StudentBasicInfo {
  id: string;
  name: string;
  email: string;
  groups: string[];
  summary: {
    totalStudyTime: number; // 分単位
    clearedQuests: number;
  };
  lastLogin: Date | null;
}

interface StudentQuest {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'stuck' | 'not_started';
  startDate?: Date;
  completedDate?: Date;
  timeSpent: number; // 分単位
}

interface LearningLog {
  timestamp: Date;
  referenceArticle: {
    title: string;
    url: string;
  };
  implementationPrompt: string; // Chrome拡張に入力した実装したい機能
  generatedQuest: {
    id: string;
    title: string;
    timeSpent: number;
  };
}

interface StudentDetailViewProps {
  studentId: string;
}

const StudentDetailView: React.FC<StudentDetailViewProps> = ({ studentId }) => {
  const [student, setStudent] = useState<StudentBasicInfo | null>(null);
  const [quests, setQuests] = useState<StudentQuest[]>([]);
  const [learningLogs, setLearningLogs] = useState<LearningLog[]>([]);
  const [loading, setLoading] = useState({
    student: true,
    quests: true,
    logs: true
  });
  const [activeTab, setActiveTab] = useState<'quests' | 'learning_process'>('quests');
  const [error, setError] = useState('');

  useEffect(() => {
    if (studentId) {
      fetchStudentDetail();
      fetchStudentQuests();
      fetchLearningLogs();
    }
  }, [studentId]);

  const fetchStudentDetail = async () => {
    try {
      setLoading(prev => ({ ...prev, student: true }));
      const response = await api.get(`/teacher/students/${studentId}`);

      if (response.data.success) {
        setStudent(response.data.data);
      } else {
        setError('生徒詳細の取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '生徒詳細の取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, student: false }));
    }
  };

  const fetchStudentQuests = async () => {
    try {
      setLoading(prev => ({ ...prev, quests: true }));
      const response = await api.get(`/teacher/students/${studentId}/quests`);

      if (response.data.success) {
        setQuests(response.data.data || []);
      } else {
        setError('クエスト進捗の取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'クエスト進捗の取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, quests: false }));
    }
  };

  const fetchLearningLogs = async () => {
    try {
      setLoading(prev => ({ ...prev, logs: true }));
      const response = await api.get(`/teacher/students/${studentId}/logs`);

      if (response.data.success) {
        setLearningLogs(response.data.data || []);
      } else {
        setError('学習ログの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '学習ログの取得に失敗しました');
    } finally {
      setLoading(prev => ({ ...prev, logs: false }));
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '未設定';
    return new Date(date).toLocaleDateString('ja-JP') + ' ' + new Date(date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: StudentQuest['status']) => {
    const statusConfig = {
      completed: { label: '完了', className: 'bg-green-100 text-green-800' },
      in_progress: { label: '進行中', className: 'bg-blue-100 text-blue-800' },
      stuck: { label: '停滞中', className: 'bg-red-100 text-red-800' },
      not_started: { label: '未開始', className: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status];
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
            onClick={fetchStudentDetail}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            生徒詳細再読み込み
          </button>
          <button
            onClick={fetchStudentQuests}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            クエスト再読み込み
          </button>
          <button
            onClick={fetchLearningLogs}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            ログ再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (loading.student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">生徒詳細を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">生徒が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="student-detail-view p-6">
      {/* 生徒基本情報ヘッダー */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            <button
              onClick={() => window.history.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              戻る
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">メールアドレス</h3>
              <p className="text-sm text-gray-900">{student.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">所属グループ</h3>
              <div className="flex flex-wrap gap-1">
                {student.groups.length > 0 ? (
                  student.groups.map((group, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {group}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">未所属</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">総学習時間</h3>
              <p className="text-sm text-gray-900">{formatTime(student.summary.totalStudyTime)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">クリア済みクエスト</h3>
              <p className="text-sm text-gray-900">{student.summary.clearedQuests}件</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-1">最終ログイン</h3>
            <p className="text-sm text-gray-900">{formatDate(student.lastLogin)}</p>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('quests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'quests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            クエスト進捗
          </button>
          <button
            onClick={() => setActiveTab('learning_process')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'learning_process'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            学習プロセス
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'quests' && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">クエスト進捗</h2>
            <p className="text-sm text-gray-600 mt-1">履修している全クエストのリストとステータス</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    クエスト名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    開始日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完了日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    所要時間
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading.quests ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : quests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      クエストが見つかりません
                    </td>
                  </tr>
                ) : (
                  quests.map(quest => (
                    <tr key={quest.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{quest.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(quest.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(quest.startDate || null)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(quest.completedDate || null)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(quest.timeSpent)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'learning_process' && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">学習プロセス</h2>
            <p className="text-sm text-gray-600 mt-1">参考記事、実装プロンプト、生成されたクエストの履歴</p>
          </div>
          <div className="p-6">
            {loading.logs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : learningLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">学習ログが見つかりません</p>
            ) : (
              <div className="space-y-6">
                {learningLogs.map((log, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">学習セッション</h3>
                      <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">参考記事</h4>
                        <a
                          href={log.referenceArticle.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          {log.referenceArticle.title}
                        </a>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">実装したい機能</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {log.implementationPrompt}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">生成されたクエスト</h4>
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{log.generatedQuest.title}</p>
                          <p className="text-gray-500">所要時間: {formatTime(log.generatedQuest.timeSpent)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetailView;