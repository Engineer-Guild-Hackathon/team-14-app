# Dashboard.tsx

## 役割
メインダッシュボード画面

## コンポーネント構成
- ヘッダー（ユーザー情報、ログアウト）
- プロジェクト一覧カード
- 進行中のクエスト
- 統計情報（登頂数、学習時間等）

## 主要な関数
- `useEffect()` - 初期データ取得
- `handleProjectSelect()` - プロジェクト選択
- `handleAddProject()` - プロジェクト追加
- `refreshStats()` - 統計情報更新

## State
- `projects: Project[]`
- `activeQuests: Quest[]`
- `stats: UserStats`
- `loading: boolean`

## 依存関係
- useProject フック
- useAuth フック
- ProjectCard コンポーネント
- StatsWidget コンポーネント