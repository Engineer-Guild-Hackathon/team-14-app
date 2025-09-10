# portfolio.service.ts

## 役割
ポートフォリオ・登頂記録管理サービス

## 主要な関数（拡張版）
- `createSummitRecord()` - 登頂記録作成（ワンクリック機能）
- `generatePortfolioEntry()` - ポートフォリオエントリー自動生成
- `createImplementationSnapshot()` - 実装コードのスナップショット作成
- `generateLearningStory()` - 記事→理解→実装の学習ストーリー生成
- `exportPortfolio()` - 複数形式でのポートフォリオエクスポート
- `generateSharableLink()` - 共有可能なポートフォリオリンク生成

## 登頂記録データ
- 実装前後のコード差分
- 使用した記事・リソース
- 実装にかかった時間
- つまずいた点とその解決過程
- 学んだ技術・概念

## エクスポート形式
- HTML/CSS（GitHub Pages対応）
- Markdown（README形式）
- JSON（API連携用）
- PDF（印刷用）

## ワンクリック機能
- クエスト完了と同時に自動でポートフォリオ候補生成
- ユーザーが確認・編集してワンクリックで公開