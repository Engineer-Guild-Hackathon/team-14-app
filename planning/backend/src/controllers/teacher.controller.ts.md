# teacher.controller.ts

## エンドポイント（教師・メンター専用）
- `GET /api/teacher/dashboard` - 教師ダッシュボードデータ取得
- `GET /api/teacher/students` - 担当生徒一覧
- `GET /api/teacher/students/:id/progress` - 生徒の詳細進捗
- `GET /api/teacher/students/:id/code-history` - 生徒のコード編集履歴
- `POST /api/teacher/classrooms` - クラス作成
- `GET /api/teacher/classrooms` - 担当クラス一覧
- `POST /api/teacher/students/:id/feedback` - 個別フィードバック送信

## 主要な関数
- `getDashboard()` - 全体概要（つまずき生徒、進捗統計等）
- `getStudentProgress()` - 生徒の学習進捗詳細
- `getCodeHistory()` - コード編集履歴と変更点
- `sendFeedback()` - 個別指導メッセージ
- `getClassroomAnalytics()` - クラス全体の学習分析

## 認可
- teacher ロールのみアクセス可能
- 担当クラスの生徒のみ閲覧可能