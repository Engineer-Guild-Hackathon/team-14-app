# ai.service.ts

## 役割
OpenAI APIとの連携、クエスト生成AI処理

## 主要な関数
- `generateQuestFromArticle()` - 記事内容からクエスト生成
- `analyzeCode()` - コード解析
- `generateHint()` - ヒント生成
- `createCodeArrangementPuzzle()` - コード並べ替えパズル作成

## プロパティ
- `openaiClient` - OpenAI APIクライアント
- `model` - 使用するGPTモデル

## 処理フロー
1. 記事のコンテンツを取得
2. プロジェクトのコンテキストを分析
3. 段階的なクエストステップを生成
4. 検証用の期待値を生成

## 依存関係
- OpenAI SDK
- プロジェクト解析サービス