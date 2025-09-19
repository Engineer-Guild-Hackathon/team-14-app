# TeacherDashboard.tsx

## 役割
教師・メンター専用ダッシュボード

## コンポーネント構成
- クラス概要カード（担当クラス数、総生徒数）
- つまずき中の生徒アラート
- リアルタイム進捗モニター
- 個別指導が必要な生徒リスト
- クラス全体の学習傾向グラフ

## 主要な関数
- `useEffect()` - リアルタイムデータ取得
- `handleStudentClick()` - 生徒の詳細進捗表示
- `sendFeedback()` - 個別フィードバック送信
- `assignQuest()` - 課題配布
- `exportClassReport()` - クラス成績レポート出力

## State
- `classrooms: Classroom[]`
- `studentsInNeed: Student[]` - サポートが必要な生徒
- `liveProgress: Map<studentId, Progress>` - リアルタイム進捗
- `classAnalytics: Analytics`

## リアルタイム機能
- WebSocketで生徒の学習状況をリアルタイム監視
- コード変更、エラー、つまずき等を即座に検知

## 依存関係
- useTeacher フック
- StudentProgressCard コンポーネント
- ClassAnalytics コンポーネント