import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface DashboardData {
  classrooms: any[];
  recentProgress: any[];
  recentLogins: any[];
  stats: {
    totalClasses: number;
    totalStudents: number;
    activeQuests: number;
    completedQuests: number;
  };
}

const TeacherDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teacher/dashboard');

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError('ダッシュボードデータの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'ダッシュボードデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const navigateToStudentDetail = (studentId: string) => {
    // Navigate to student detail page
    window.location.hash = `#/teacher/students/${studentId}`;
  };

  const navigateToStudentManagement = () => {
    // Navigate to student management page
    window.location.hash = '#/teacher/students';
  };

  const navigateToQuestManagement = () => {
    // Navigate to quest management page
    window.location.hash = '#/teacher/quests';
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-semibold mb-2">エラーが発生しました</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">教師ダッシュボード</h1>
        <p className="text-gray-600">生徒の学習状況とクラス管理</p>
      </div>

      {/* ナビゲーションパネル */}
      <div className="mb-8">
        <div className="flex space-x-4">
          <button
            onClick={navigateToStudentManagement}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            生徒管理
          </button>
          <button
            onClick={navigateToQuestManagement}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            クエスト管理
          </button>
        </div>
      </div>

      {/* 統計サマリー */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">クラス数</h3>
            <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalClasses}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">生徒数</h3>
            <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">進行中クエスト</h3>
            <p className="text-2xl font-bold text-blue-600">{dashboardData.stats.activeQuests}</p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">完了クエスト</h3>
            <p className="text-2xl font-bold text-green-600">{dashboardData.stats.completedQuests}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 最近の進捗 */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="text-blue-500 mr-2">📊</span>
              最近の進捗
            </h2>
            <p className="text-sm text-gray-600 mt-1">生徒のクエスト進捗状況</p>
          </div>
          <div className="p-6">
            {!dashboardData?.recentProgress.length ? (
              <p className="text-gray-500 text-center py-8">最近の進捗はありません</p>
            ) : (
              <div className="space-y-4">
                {dashboardData.recentProgress.map((progress: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{progress.user.name}</h3>
                      <span className="text-xs text-gray-500">
                        {new Date(progress.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      クエスト: {progress.quest.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded ${
                        progress.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {progress.status === 'COMPLETED' ? '完了' : '進行中'}
                      </span>
                      <button
                        onClick={() => navigateToStudentDetail(progress.userId)}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                      >
                        詳細確認
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 最近のログイン */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="text-green-500 mr-2">👥</span>
              最近のログイン
            </h2>
            <p className="text-sm text-gray-600 mt-1">最近ログインした生徒</p>
          </div>
          <div className="p-6">
            {!dashboardData?.recentLogins.length ? (
              <p className="text-gray-500 text-center py-8">最近のログインはありません</p>
            ) : (
              <div className="space-y-4">
                {dashboardData.recentLogins.map((user: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <span className="text-xs text-gray-500">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '未ログイン'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{user.email}</p>
                    <button
                      onClick={() => navigateToStudentDetail(user.id)}
                      className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                    >
                      詳細確認
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;