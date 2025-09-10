# achievement.controller.ts

## エンドポイント（登頂記録・アチーブメント）
- `POST /api/achievements/summit` - 登頂記録作成（ワンクリック）
- `GET /api/achievements` - ユーザーの登頂記録一覧
- `GET /api/achievements/:id` - 登頂記録詳細
- `POST /api/achievements/:id/portfolio` - ポートフォリオ項目として公開
- `GET /api/achievements/badges` - 獲得バッジ一覧
- `GET /api/achievements/timeline` - 学習タイムライン

## 主要な関数
- `createSummitRecord()` - クエスト完了時の登頂記録作成
- `generatePortfolioEntry()` - ワンクリックでのポートフォリオエントリー生成
- `awardBadge()` - バッジ付与（初回実装、連続クリア等）
- `getSummitGallery()` - 登頂記録ギャラリー表示
- `shareImplementation()` - 実装内容の共有機能

## リクエスト/レスポンス
- createSummitRecord: `{ questId, codeSnapshot, reflection }` → `{ summitId, badgeAwarded }`
- generatePortfolioEntry: `{ summitId, title, description, isPublic }` → `{ portfolioUrl }`

## 登頂バッジ種類
- 初登頂、連続登頂、難易度制覇、実装スピード等