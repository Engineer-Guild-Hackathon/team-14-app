import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface Classroom {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  students: ClassroomStudent[];
  assignments: Assignment[];
  _count: {
    students: number;
    assignments: number;
  };
}

interface ClassroomStudent {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  quest: {
    title: string;
    difficulty: string;
  };
}

interface StudentInNeed {
  user: {
    id: string;
    name: string;
    email: string;
  };
  quest: {
    title: string;
    difficulty: string;
  };
  updatedAt: string;
}

interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  studentsInNeed: number;
  activeQuests: number;
  completedQuests: number;
}

const TeacherDashboard: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [studentsInNeed, setStudentsInNeed] = useState<StudentInNeed[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalStudents: 0,
    studentsInNeed: 0,
    activeQuests: 0,
    completedQuests: 0
  });
  const [recentProgress, setRecentProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    message: '',
    questId: ''
  });

  useEffect(() => {
    loadDashboardData();
    
    // リアルタイム更新の設定
    const interval = setInterval(loadDashboardData, 30000); // 30秒ごと
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.getTeacherDashboard();
      
      if (response.success) {
        const { classrooms, studentsInNeed, stats, recentProgress } = response.data;
        
        setClassrooms(classrooms || []);
        setStudentsInNeed(studentsInNeed || []);
        setStats(stats || {
          totalClasses: 0,
          totalStudents: 0,
          studentsInNeed: 0,
          activeQuests: 0,
          completedQuests: 0
        });
        setRecentProgress(recentProgress || []);
      } else {
        setError('ダッシュボードデータの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'ダッシュボードデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };;

  const sendFeedback = async (studentId: string) => {
    try {
      const response = await api.post(`/teacher/students/${studentId}/feedback`, feedbackForm);
      
      if (response.data.success) {
        alert('フィードバックを送信しました');
        setFeedbackForm({ message: '', questId: '' });
        setSelectedStudent(null);
      } else {
        alert('フィードバックの送信に失敗しました');
      }
    } catch (error: any) {
      alert('フィードバックの送信に失敗しました: ' + error.message);
    }
  };

  const viewStudentProgress = async (studentId: string) => {
    try {
      const response = await api.get(`/teacher/students/${studentId}/progress`);
      
      if (response.data.success) {
        // 新しいウィンドウで生徒の詳細進捗を表示
        const progressWindow = window.open('', '_blank', 'width=800,height=600');
        if (progressWindow) {
          progressWindow.document.write(`
            <html>
              <head>
                <title>生徒の学習進捗</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .progress-item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                  .quest-title { font-weight: bold; color: #333; }
                  .progress-bar { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
                  .progress-fill { height: 100%; background: #4CAF50; transition: width 0.3s ease; }
                </style>
              </head>
              <body>
                <h2>学習進捗詳細</h2>
                <pre>${JSON.stringify(response.data.data, null, 2)}</pre>
              </body>
            </html>
          `);
        }
      }
    } catch (error: any) {
      alert('進捗データの取得に失敗しました: ' + error.message);
    }
  };

  const createClassroom = async () => {
    const name = prompt('クラス名を入力してください');
    const description = prompt('クラスの説明を入力してください（任意）');
    
    if (!name) return;
    
    try {
      const response = await api.post('/teacher/classrooms', { name, description });
      
      if (response.data.success) {
        loadDashboardData(); // リフレッシュ
        alert(`クラスを作成しました。招待コード: ${response.data.data.classroom.inviteCode}`);
      } else {
        alert('クラスの作成に失敗しました');
      }
    } catch (error: any) {
      alert('クラスの作成に失敗しました: ' + error.message);
    }
  };

  const assignQuest = async (classroomId: string) => {
    const title = prompt('課題名を入力してください');
    const questId = prompt('クエストIDを入力してください');
    const description = prompt('課題の説明を入力してください（任意）');
    const dueDateStr = prompt('締切日を入力してください（YYYY-MM-DD形式、任意）');
    
    if (!title || !questId) return;
    
    const dueDate = dueDateStr ? new Date(dueDateStr).toISOString() : null;
    
    try {
      const response = await api.post('/teacher/assignments', {
        classroomId,
        questId,
        title,
        description,
        dueDate
      });
      
      if (response.data.success) {
        loadDashboardData(); // リフレッシュ
        alert('課題を配布しました');
      } else {
        alert('課題の配布に失敗しました');
      }
    } catch (error: any) {
      alert('課題の配布に失敗しました: ' + error.message);
    }
  };

  const getTimeSinceUpdate = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffInHours = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}日前`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-semibold mb-2">エラーが発生しました</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">教師ダッシュボード</h1>
        <p className="text-gray-600">生徒の学習状況をリアルタイムで監視・サポート</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-blue-600 text-2xl mr-3">🏫</div>
            <div>
              <p className="text-sm font-medium text-blue-600">担当クラス数</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-green-600 text-2xl mr-3">👥</div>
            <div>
              <p className="text-sm font-medium text-green-600">総生徒数</p>
              <p className="text-2xl font-bold text-green-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-yellow-600 text-2xl mr-3">⚠️</div>
            <div>
              <p className="text-sm font-medium text-yellow-600">サポートが必要</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.studentsInNeed}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-purple-600 text-2xl mr-3">🏃</div>
            <div>
              <p className="text-sm font-medium text-purple-600">進行中クエスト</p>
              <p className="text-2xl font-bold text-purple-900">{stats.activeQuests}</p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-emerald-600 text-2xl mr-3">✅</div>
            <div>
              <p className="text-sm font-medium text-emerald-600">完了クエスト</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.completedQuests}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* つまずき中の生徒 */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="text-red-500 mr-2">🚨</span>
              サポートが必要な生徒
            </h2>
          </div>
          <div className="p-6">
            {studentsInNeed.length === 0 ? (
              <p className="text-gray-500 text-center py-8">現在サポートが必要な生徒はいません</p>
            ) : (
              <div className="space-y-4">
                {studentsInNeed.map((student, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{student.user.name}</h3>
                      <span className="text-xs text-gray-500">
                        {getTimeSinceUpdate(student.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      クエスト: {student.quest.title} ({student.quest.difficulty})
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewStudentProgress(student.user.id)}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        詳細確認
                      </button>
                      <button
                        onClick={() => setSelectedStudent(student.user.id)}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        フィードバック
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 担当クラス一覧 */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="text-blue-500 mr-2">🏫</span>
                担当クラス
              </h2>
              <button
                onClick={createClassroom}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                新規クラス作成
              </button>
            </div>
          </div>
          <div className="p-6">
            {classrooms.length === 0 ? (
              <p className="text-gray-500 text-center py-8">まだクラスがありません</p>
            ) : (
              <div className="space-y-4">
                {classrooms.map((classroom) => (
                  <div key={classroom.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{classroom.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        招待コード: {classroom.inviteCode}
                      </span>
                    </div>
                    {classroom.description && (
                      <p className="text-sm text-gray-600 mb-3">{classroom.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        生徒: {classroom._count.students}人 | 課題: {classroom._count.assignments}件
                      </div>
                      <button
                        onClick={() => assignQuest(classroom.id)}
                        className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                      >
                        課題配布
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* フィードバックモーダル */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">個別フィードバック</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象クエストID（任意）
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={feedbackForm.questId}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, questId: e.target.value }))}
                  placeholder="特定のクエストに関するフィードバックの場合"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  フィードバック内容
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={4}
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="生徒への個別指導メッセージを入力してください"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => setSelectedStudent(null)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
              <button
                onClick={() => sendFeedback(selectedStudent)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={!feedbackForm.message.trim()}
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;