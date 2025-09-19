# QuestManagement.tsx

## 役割
クエスト管理画面（teacher.md準拠）

## コンポーネント構成

### クエスト一覧表示
```typescript
interface QuestListProps {
  quests: Quest[];
  onQuestSelect: (quest: Quest) => void;
  onAssignQuest: (questId: string) => void;
}

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

// 表示項目（teacher.md仕様）
- クエスト名
- 関連技術記事
- 難易度
- 挑戦中の生徒数
```

### 検索・フィルタ機能
```typescript
interface QuestFilters {
  searchQuery: string;
  difficultyFilter: 'all' | 'beginner' | 'intermediate' | 'advanced';
  statusFilter: 'all' | 'active' | 'completed';
}

// 機能（teacher.md仕様）
- クエスト名での検索
- 難易度によるフィルタ
- 状況によるフィルタ
```

### 課題の割り当て機能
```typescript
interface AssignmentModal {
  selectedQuest: Quest;
  assignmentType: 'individual' | 'group';
  targetStudents: string[];
  targetGroups: string[];
  isOpen: boolean;
}

// 機能（teacher.md仕様）
- 特定のクエストを選択
- 推奨課題として生徒個人またはグループに割り当て
- 生徒の学習計画の設計を支援
```

## State Management
```typescript
interface QuestManagementState {
  quests: Quest[];
  students: Student[];
  groups: Group[];
  loading: {
    quests: boolean;
    students: boolean;
    groups: boolean;
  };
  filters: QuestFilters;
  assignmentModal: AssignmentModal;
  selectedQuests: string[];
}
```

## 主要な関数
```typescript
// データ取得（teacher.md API準拠）
const fetchQuests = async () => void;
const fetchStudents = async () => void;
const fetchGroups = async () => void;

// 検索・フィルタ
const searchQuests = (query: string) => void;
const filterByDifficulty = (difficulty: string) => void;
const filterByStatus = (status: string) => void;

// 課題割り当て
const assignQuestToStudent = async (questId: string, studentId: string) => void;
const assignQuestToGroup = async (questId: string, groupId: string) => void;
const bulkAssignQuest = async (questId: string, targetIds: string[], targetType: 'students' | 'groups') => void;

// UI操作
const openAssignmentModal = (quest: Quest) => void;
const closeAssignmentModal = () => void;
const selectQuest = (questId: string) => void;
```

## UI/UXコンポーネント
- `QuestTable` - クエスト一覧テーブル
- `QuestCard` - クエスト情報カード
- `SearchAndFilter` - 検索・フィルター機能
- `AssignmentModal` - 課題割り当てモーダル
- `StudentSelector` - 生徒選択コンポーネント
- `GroupSelector` - グループ選択コンポーネント

## 依存関係
- useQuests フック
- useStudents フック
- useGroups フック
- useAssignments フック