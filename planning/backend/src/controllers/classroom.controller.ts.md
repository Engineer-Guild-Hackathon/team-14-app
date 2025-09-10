# classroom.controller.ts

## エンドポイント
- `POST /api/classrooms` - クラスルーム作成
- `GET /api/classrooms` - クラスルーム一覧
- `GET /api/classrooms/:id` - クラスルーム詳細
- `POST /api/classrooms/:id/students` - 生徒をクラスに追加
- `DELETE /api/classrooms/:id/students/:studentId` - 生徒をクラスから削除
- `GET /api/classrooms/:id/assignments` - クラス課題一覧
- `POST /api/classrooms/:id/assignments` - 課題配布

## 主要な関数
- `createClassroom()` - クラスルーム作成
- `addStudent()` - 生徒招待・追加
- `removeStudent()` - 生徒削除
- `assignQuest()` - 課題として特定クエストを配布
- `getClassroomStats()` - クラス全体統計

## リクエスト/レスポンス
- createClassroom: `{ name, description, inviteCode }` → `{ classroom, inviteLink }`
- assignQuest: `{ questTemplate, dueDate, instruction }` → `{ assignmentId }`