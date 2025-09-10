# index.ts (content)

## 役割
Webページに注入されるコンテンツスクリプト

## 主要な関数
- `extractArticleContent()` - 記事コンテンツ抽出
- `highlightCodeBlocks()` - コードブロックのハイライト
- `detectTechnicalArticle()` - 技術記事判定
- `sendPageInfo()` - ページ情報をバックグラウンドに送信

## 対象サイト
- Qiita
- Zenn
- Medium
- Dev.to
- はてなブログ

## 抽出データ
- 記事タイトル
- コードブロック
- 技術スタック
- 記事URL