# StudentDetailView.tsx

## 役割
個別生徒詳細画面（teacher.md準拠）

## コンポーネント構成

### 基本情報表示
```typescript
interface StudentBasicInfo {
  id: string;
  name: string;
  email: string;
  groups: string[];
  summary: {
    totalStudyTime: number; // 分単位
    clearedQuests: number;
  };
  lastLogin: Date;
}
```

### タブ形式インターフェース

#### クエスト進捗タブ
```typescript
interface QuestProgressTab {
  quests: StudentQuest[];
}

interface StudentQuest {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'stuck' | 'not_started';
  startDate?: Date;
  completedDate?: Date;
  timeSpent: number; // 分単位
}

// 表示要素（teacher.md仕様）
- 履修している全クエストのリストとステータス
- 各クエストの開始日、完了日、かかった時間
```

#### 学習プロセスタブ（CodeClimb独自機能）
```typescript
interface LearningProcessTab {
  learningLogs: LearningLog[];
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

// 表示要素（teacher.md仕様）
- 参考記事: 生徒がどの技術記事を参考にしていたか
- 実装したい機能（プロンプト）: Chrome拡張機能に入力したテキスト履歴
- 生成されたクエスト: プロンプトに基づきAIが生成したクエストと時間
```

## State Management
```typescript
interface StudentDetailState {
  student: StudentBasicInfo;
  quests: StudentQuest[];
  learningLogs: LearningLog[];
  loading: {
    student: boolean;
    quests: boolean;
    logs: boolean;
  };
  activeTab: 'quests' | 'learning_process';
}
```

## 主要な関数
```typescript
// データ取得（teacher.md API準拠）
const fetchStudentDetail = async (studentId: string) => void;
const fetchStudentQuests = async (studentId: string) => void;
const fetchLearningLogs = async (studentId: string) => void;

// 基本操作
const updateStudentInfo = async (studentId: string, data: UpdateStudentData) => void;
const navigateToQuestDetail = (questId: string) => void;
```

## UI/UXコンポーネント
- `StudentHeader` - 基本情報表示ヘッダー
- `QuestProgressTable` - クエスト進捗一覧テーブル
- `LearningProcessTimeline` - 学習プロセスタイムライン
- `TabNavigation` - タブ切り替えナビゲーション

## 依存関係
- useStudentDetail フック
- useQuestProgress フック
- useLearningLogs フック