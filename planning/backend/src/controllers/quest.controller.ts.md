# quest.controller.ts

## エンドポイント
- `POST /api/quests/generate` - クエスト生成
- `GET /api/quests` - クエスト一覧取得
- `GET /api/quests/:id` - クエスト詳細取得
- `PUT /api/quests/:id/progress` - 進捗更新
- `POST /api/quests/:id/verify` - コード検証

## 主要な関数
- `generateQuest()` - 記事URLからクエスト生成
- `getQuests()` - ユーザーのクエスト一覧
- `getQuestDetail()` - クエスト詳細とステップ
- `updateProgress()` - クエスト進捗更新
- `verifyCode()` - 提出コードの検証

## リクエスト/レスポンス
- generateQuest: `{ articleUrl, projectId, description }` → `{ questId, steps }`
- verifyCode: `{ questId, stepId, code }` → `{ isCorrect, feedback }`

## 依存関係
- quest.service.ts でクエスト生成ロジック
- ai.service.ts でOpenAI API連携
- verification.service.ts でコード検証