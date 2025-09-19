# TeacherDashboard.tsx

## 役割
教師・メンター専用ダッシュボード（teacher.md準拠）

## コンポーネント構成

### アラートウィジェット
```typescript
interface AlertWidget {
  stuckStudents: StuckStudent[];
}

interface StuckStudent {
  studentId: string;
  studentName: string;
  questTitle: string;
  stuckDuration: number; // 分単位
}

// 機能（teacher.md仕様）
- 特定のクエストで長時間停滞している生徒を自動でリストアップ
```

### アクティビティウィジェット
```typescript
interface ActivityWidget {
  recentActivities: RecentActivity[];
}

interface RecentActivity {
  studentId: string;
  studentName: string;
  activityType: 'quest_completed' | 'login';
  details: string;
  timestamp: Date;
}

// 機能（teacher.md仕様）
- 最近クエストをクリアした生徒の一覧を表示
- ログインした生徒の一覧を表示
```

## State Management
```typescript
interface TeacherDashboardState {
  stuckStudents: StuckStudent[];
  recentActivities: RecentActivity[];
  loading: {
    alerts: boolean;
    activities: boolean;
  };
}
```

## 主要な関数
```typescript
// データ取得（teacher.md API準拠）
const fetchStuckStudents = async () => void;
const fetchRecentActivities = async () => void;

// ナビゲーション
const navigateToStudentDetail = (studentId: string) => void;
const navigateToStudentManagement = () => void;
const navigateToQuestManagement = () => void;
```

## UI/UXコンポーネント
- `AlertWidget` - 停滞生徒アラート表示
- `ActivityWidget` - 最近の活動表示
- `StudentCard` - 生徒情報カード
- `NavigationPanel` - 各画面への遷移

## 依存関係
- useTeacherDashboard フック