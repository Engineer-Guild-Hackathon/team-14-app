# gallery.controller.ts

## エンドポイント（「絶景」実装ギャラリー）
- `GET /api/gallery/article/:articleHash` - 同記事からの実装ギャラリー
- `GET /api/gallery/featured` - 注目の実装ギャラリー
- `GET /api/gallery/recent` - 最新の実装ギャラリー
- `POST /api/gallery/:implementationId/like` - 実装にいいね
- `POST /api/gallery/:implementationId/comment` - 実装にコメント
- `GET /api/gallery/user/:userId` - ユーザーの公開実装一覧

## 主要な関数
- `getImplementationsByArticle()` - 同一記事からの様々な実装例表示
- `getFeaturedImplementations()` - キュレーション済み実装例
- `getImplementationDetails()` - 実装の詳細とコード
- `likeImplementation()` - 実装への評価
- `addComment()` - 実装へのコメント・質問

## 表示データ
- コードスニペット
- 実装アプローチの説明
- 使用技術スタック
- 実装時間・難易度
- ユーザー評価・コメント

## プライバシー
- ユーザーが公開を選択した実装のみ表示
- 匿名表示オプション