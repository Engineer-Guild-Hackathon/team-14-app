# teacher.routes.ts

## 先生専用APIルート設計（teacher.md準拠）

### 認証とロール
- すべてのエンドポイントで `TEACHER` または `MENTOR` ロールが必須
- JWT認証 + ロールベースアクセス制御

### エンドポイント構成

#### 認証 (/auth)
```typescript
POST /api/v1/teacher/login
// 教師ログイン、認証トークン取得
```

#### 生徒管理 (/students)
```typescript
GET /api/v1/teacher/students
// 生徒一覧取得（検索、フィルタ対応）

POST /api/v1/teacher/students
// 生徒新規登録

GET /api/v1/teacher/students/:studentId
// 生徒詳細情報取得

PUT /api/v1/teacher/students/:studentId
// 生徒情報更新

DELETE /api/v1/teacher/students/:studentId
// 生徒削除
```

#### グループ管理 (/groups)
```typescript
GET /api/v1/teacher/groups
// グループ一覧取得

POST /api/v1/teacher/groups
// 新規グループ作成

PUT /api/v1/teacher/groups/:groupId
// グループ名変更

POST /api/v1/teacher/groups/:groupId/students
// グループに生徒追加
```

#### 進捗・学習プロセス (/progress)
```typescript
GET /api/v1/teacher/students/:studentId/quests
// 生徒のクエスト進捗一覧取得

GET /api/v1/teacher/students/:studentId/logs
// 生徒の学習プロセス詳細取得
// (参考記事、入力プロンプト、クエスト履歴)
```

#### ダッシュボード
```typescript
GET /api/v1/teacher/dashboard/alerts
// 長時間停滞している生徒リスト

GET /api/v1/teacher/dashboard/activity
// 最近の生徒活動（クエストクリア、ログイン）
```

#### クエスト管理
```typescript
GET /api/v1/teacher/quests
// クエスト一覧（名前、関連記事、難易度、挑戦中生徒数）

POST /api/v1/teacher/assignments
// 特定クエストを生徒/グループに課題として割り当て
```

## ミドルウェア構成
- `auth.middleware.ts` - JWT認証
- `role.middleware.ts` - 教師ロール確認

## エラーハンドリング
- 401: 未認証
- 403: 権限不足（TEACHERロール以外）
- 404: 生徒/グループが見つからない