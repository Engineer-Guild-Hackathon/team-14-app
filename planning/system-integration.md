# システム全体の連携

## コンポーネント間の通信

### 1. クエスト生成フロー
```
Chrome Extension → Backend API → OpenAI → Backend → Chrome Extension
                                         ↓
                                    Database
```

1. Chrome拡張で記事URLと実装内容を入力
2. Backend APIへPOSTリクエスト
3. OpenAI APIでクエスト生成
4. データベースに保存
5. Chrome拡張へレスポンス返却

### 2. コード検証フロー
```
PC Client (File Change) → Backend → Verification Service
                          ↓
                     WebSocket Broadcast
                          ↓
                    Chrome Extension
```

1. PC Clientがファイル変更を検知
2. 差分をBackendへ送信
3. Verification Serviceで期待値と比較
4. WebSocketでChrome拡張へ結果通知

### 3. リアルタイム同期
```
     Backend (WebSocket Server)
       /              \
PC Client        Chrome Ext
```

- 双方向通信でリアルタイム更新
- プロジェクトごとのルーム管理
- 進捗状況の即座反映

## API エンドポイント設計

### 認証系
- `POST /api/auth/register` - 新規登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/refresh` - トークン更新
- `POST /api/auth/logout` - ログアウト

### プロジェクト系
- `GET /api/projects` - プロジェクト一覧
- `POST /api/projects` - プロジェクト登録
- `GET /api/projects/:id` - プロジェクト詳細
- `PUT /api/projects/:id` - プロジェクト更新
- `DELETE /api/projects/:id` - プロジェクト削除

### クエスト系
- `POST /api/quests/generate` - クエスト生成
- `GET /api/quests` - クエスト一覧
- `GET /api/quests/:id` - クエスト詳細
- `PUT /api/quests/:id/progress` - 進捗更新
- `POST /api/quests/:id/verify` - コード検証

### 教師・メンター系
- `GET /api/teacher/dashboard` - 教師ダッシュボード
- `GET /api/teacher/students` - 担当生徒一覧
- `GET /api/teacher/students/:id/progress` - 生徒進捗詳細
- `POST /api/teacher/students/:id/feedback` - 個別フィードバック
- `POST /api/classrooms` - クラス作成
- `GET /api/classrooms` - クラス一覧
- `POST /api/classrooms/:id/students` - 生徒追加
- `POST /api/classrooms/:id/assignments` - 課題配布

### ポートフォリオ・登頂記録系
- `POST /api/achievements/summit` - 登頂記録作成（ワンクリック）
- `GET /api/achievements` - 登頂記録一覧
- `POST /api/achievements/:id/portfolio` - ポートフォリオ公開
- `GET /api/portfolio` - ポートフォリオ取得
- `GET /api/portfolio/public/:userId` - 公開ポートフォリオ

### 実装ギャラリー系（「絶景」ギャラリー） **⚠️ Phase2以降に保留 - 今はやらない**
- `GET /api/gallery/article/:articleHash` - 同記事の実装ギャラリー
- `GET /api/gallery/featured` - 注目の実装
- `POST /api/gallery/:id/like` - 実装にいいね
- `POST /api/gallery/:id/comment` - 実装にコメント

### ピアレビュー系
- `POST /api/reviews/request` - レビュー依頼
- `GET /api/reviews/requests` - レビュー依頼一覧
- `POST /api/reviews/:id/submit` - レビュー提出
- `GET /api/reviews/given` - 自分が行ったレビュー

### 学習分析系
- `GET /api/analytics/progress` - 学習進捗分析
- `GET /api/analytics/code-history` - コード編集履歴
- `GET /api/analytics/learning-pattern` - 学習パターン分析

## WebSocket イベント

### クライアント → サーバー
- `join-project` - プロジェクトルーム参加
- `leave-project` - プロジェクトルーム退出
- `code-update` - コード更新通知
- `request-verification` - 検証リクエスト

### サーバー → クライアント
- `verification-result` - 検証結果
- `quest-progress` - クエスト進捗更新
- `quest-completed` - クエスト完了通知
- `user-joined` - ユーザー参加通知

## データベース設計

### テーブル構成
- users - ユーザー情報
- projects - プロジェクト情報
- quests - クエスト情報
- quest_steps - クエストステップ
- progress - 進捗情報
- portfolios - ポートフォリオ
- portfolio_entries - ポートフォリオエントリー

### リレーション
- User 1-N Project
- User 1-N Quest
- Quest 1-N QuestStep
- Quest 1-N Progress
- User 1-1 Portfolio
- Portfolio 1-N PortfolioEntry

## セキュリティ

### 認証
- JWT Bearer Token
- リフレッシュトークン機構
- トークン有効期限: 24時間

### 通信
- HTTPS必須
- WebSocket over TLS
- CORS設定

### データ保護
- パスワードハッシュ化 (bcrypt)
- SQLインジェクション対策 (Prisma ORM)
- XSS対策 (入力サニタイゼーション)

## エラーハンドリング

### HTTPステータスコード
- 200: 成功
- 201: 作成成功
- 400: バッドリクエスト
- 401: 認証エラー
- 403: 権限エラー
- 404: リソース不在
- 500: サーバーエラー

### エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {}
  }
}
```

## 環境構成

### 開発環境
- Backend: localhost:3000
- PC Client: Electron Dev Mode
- Chrome Extension: 開発者モード

### 本番環境
- Backend: サーバー環境
- Database: PostgreSQL/MySQL
- WebSocket: WebSocketサーバー
- ファイルストレージ: 静的ファイルサーバー