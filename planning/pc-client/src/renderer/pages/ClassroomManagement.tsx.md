# ClassroomManagement.tsx

## 役割
教師用生徒管理画面（teacher.md準拠）

## コンポーネント構成

### 生徒管理画面
```typescript
interface StudentManagementProps {
  students: Student[];
  groups: Group[];
  onStudentSelect: (student: Student) => void;
}

// 表示項目（teacher.md仕様）
- 生徒ID, 氏名, メールアドレス, 所属グループ, クエスト進捗率, 最終ログイン日時
```

### 機能詳細

#### 生徒一覧表示
```typescript
// teacher.md仕様の基本機能のみ
- 検索機能（氏名、メールアドレス）
- フィルタ機能（グループごと）
- 並べ替え機能（各項目ごと）
- 生徒詳細画面への遷移
```

#### 生徒アカウント発行
```typescript
interface StudentRegistrationForm {
  name: string;
  email: string; // 学校指定メールアドレス
  groupId?: string;
}

// 個別登録のみ（一括登録なし）
```

#### グループ管理
```typescript
interface GroupManagement {
  groups: Group[];
  onCreateGroup: (group: CreateGroupData) => void;
  onUpdateGroup: (groupId: string, data: UpdateGroupData) => void;
  onDeleteGroup: (groupId: string) => void;
  onAssignStudent: (studentId: string, groupId: string) => void;
}

// teacher.md仕様
- グループ作成、編集、削除
- 生徒をドラッグ＆ドロップでグループ割り当て
- 一人の生徒を複数グループに所属可能
```

## State Management
```typescript
interface StudentManagementState {
  students: Student[];
  groups: Group[];
  selectedStudents: string[];
  loading: {
    students: boolean;
    groups: boolean;
  };
  filters: {
    searchQuery: string;
    selectedGroupId: string | null;
  };
  sortConfig: {
    field: 'name' | 'email' | 'progress' | 'lastLogin';
    direction: 'asc' | 'desc';
  };
}
```

## 主要な関数
```typescript
// 生徒管理（teacher.md API準拠）
const fetchStudents = async () => void;
const createStudent = async (student: CreateStudentData) => void;
const updateStudent = async (id: string, data: UpdateStudentData) => void;
const deleteStudent = async (id: string) => void;

// グループ管理
const fetchGroups = async () => void;
const createGroup = async (group: CreateGroupData) => void;
const updateGroup = async (id: string, data: UpdateGroupData) => void;
const deleteGroup = async (id: string) => void;
const assignStudentToGroup = async (studentId: string, groupId: string) => void;

// 検索・フィルタ
const filterStudents = (searchQuery: string, groupId?: string) => void;
const sortStudents = (field: string, direction: 'asc' | 'desc') => void;
```

## UI/UXコンポーネント
- `StudentTable` - 生徒一覧テーブル
- `StudentRegistrationForm` - 生徒登録フォーム
- `GroupManagement` - グループ管理
- `DragDropStudentCard` - ドラッグ&ドロップ対応生徒カード
- `SearchAndFilter` - 検索・フィルター機能

## 依存関係
- useStudents フック
- useGroups フック