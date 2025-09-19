import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface Student {
  id: string;
  name: string;
  email: string;
  groups: Group[];
  progressRate: number;
  lastLoginAt: Date | null;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  studentsCount: number;
}

interface CreateStudentData {
  name: string;
  email: string;
  groupId?: string;
}

interface CreateGroupData {
  name: string;
  description?: string;
}

const ClassroomManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState({
    students: true,
    groups: true
  });
  const [filters, setFilters] = useState({
    searchQuery: '',
    selectedGroupId: null as string | null
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'name' as 'name' | 'email' | 'progress' | 'lastLogin',
    direction: 'asc' as 'asc' | 'desc'
  });
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [registrationForm, setRegistrationForm] = useState<CreateStudentData>({
    name: '',
    email: '',
    groupId: undefined
  });
  const [groupForm, setGroupForm] = useState<CreateGroupData>({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

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

  const createStudent = async () => {
    try {
      const response = await api.post('/teacher/students', registrationForm);

      if (response.data.success) {
        await fetchStudents();
        setShowRegistrationForm(false);
        setRegistrationForm({ name: '', email: '', groupId: undefined });
        alert('生徒を登録しました');
      } else {
        alert('生徒の登録に失敗しました');
      }
    } catch (error: any) {
      alert('生徒の登録に失敗しました: ' + error.message);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm('この生徒を削除してもよろしいですか？')) return;

    try {
      const response = await api.delete(`/teacher/students/${studentId}`);

      if (response.data.success) {
        await fetchStudents();
        alert('生徒を削除しました');
      } else {
        alert('生徒の削除に失敗しました');
      }
    } catch (error: any) {
      alert('生徒の削除に失敗しました: ' + error.message);
    }
  };

  const createGroup = async () => {
    try {
      const response = await api.post('/teacher/groups', groupForm);

      if (response.data.success) {
        await fetchGroups();
        setShowGroupForm(false);
        setGroupForm({ name: '', description: '' });
        alert('グループを作成しました');
      } else {
        alert('グループの作成に失敗しました');
      }
    } catch (error: any) {
      alert('グループの作成に失敗しました: ' + error.message);
    }
  };

  const assignStudentToGroup = async (studentId: string, groupId: string) => {
    try {
      const response = await api.post(`/teacher/groups/${groupId}/students`, { studentId });

      if (response.data.success) {
        await fetchStudents();
        await fetchGroups();
        alert('生徒をグループに追加しました');
      } else {
        alert('グループへの追加に失敗しました');
      }
    } catch (error: any) {
      alert('グループへの追加に失敗しました: ' + error.message);
    }
  };

  const navigateToStudentDetail = (studentId: string) => {
    // Navigate to student detail page
    window.location.hash = `#/teacher/students/${studentId}`;
  };

  const filteredAndSortedStudents = students
    .filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           student.email.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesGroup = !filters.selectedGroupId ||
                          student.groups.some(group => group.id === filters.selectedGroupId);
      return matchesSearch && matchesGroup;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortConfig.field) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'progress':
          aValue = a.progressRate;
          bValue = b.progressRate;
          break;
        case 'lastLogin':
          aValue = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          bValue = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: typeof sortConfig.field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatLastLogin = (lastLogin: Date | null) => {
    if (!lastLogin) return '未ログイン';
    const date = new Date(lastLogin);
    return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-semibold mb-2">エラーが発生しました</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex space-x-2">
          <button
            onClick={fetchStudents}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            生徒データ再読み込み
          </button>
          <button
            onClick={fetchGroups}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            グループデータ再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="classroom-management p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">生徒・グループ管理</h1>
        <p className="text-gray-600">教室内の生徒とグループを管理</p>
      </div>

      {/* 検索・フィルター・アクション */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="生徒名またはメールアドレスで検索"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              />
            </div>
            <div>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.selectedGroupId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, selectedGroupId: e.target.value || null }))}
              >
                <option value="">全てのグループ</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowRegistrationForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                生徒登録
              </button>
              <button
                onClick={() => setShowGroupForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                グループ作成
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* グループ一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-gray-600 mb-2">{group.description}</p>
            )}
            <p className="text-sm text-gray-500">生徒数: {group.studentsCount}人</p>
          </div>
        ))}
      </div>

      {/* 生徒一覧テーブル */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">生徒一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  氏名 {sortConfig.field === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                >
                  メールアドレス {sortConfig.field === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  所属グループ
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('progress')}
                >
                  進捗率 {sortConfig.field === 'progress' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lastLogin')}
                >
                  最終ログイン {sortConfig.field === 'lastLogin' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading.students ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredAndSortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    条件に一致する生徒が見つかりません
                  </td>
                </tr>
              ) : (
                filteredAndSortedStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {student.groups.map(group => (
                          <span key={group.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {group.name}
                          </span>
                        ))}
                        {student.groups.length === 0 && (
                          <span className="text-xs text-gray-500">未所属</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${student.progressRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{student.progressRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastLogin(student.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => navigateToStudentDetail(student.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        詳細
                      </button>
                      <button
                        onClick={() => deleteStudent(student.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 生徒登録モーダル */}
      {showRegistrationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">新規生徒登録</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">氏名</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={registrationForm.name}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="生徒の氏名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={registrationForm.email}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="学校指定メールアドレス"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">グループ（任意）</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={registrationForm.groupId || ''}
                  onChange={(e) => setRegistrationForm(prev => ({ ...prev, groupId: e.target.value || undefined }))}
                >
                  <option value="">グループを選択</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => setShowRegistrationForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
              <button
                onClick={createStudent}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={!registrationForm.name.trim() || !registrationForm.email.trim()}
              >
                登録
              </button>
            </div>
          </div>
        </div>
      )}

      {/* グループ作成モーダル */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">新規グループ作成</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">グループ名</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="グループ名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">説明（任意）</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  value={groupForm.description}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="グループの説明"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => setShowGroupForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
              <button
                onClick={createGroup}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                disabled={!groupForm.name.trim()}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomManagement;