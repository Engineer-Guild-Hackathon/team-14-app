# CodeClimb コードスタイル・規約

## TypeScript 規約
- 全プロジェクトでTypeScriptを使用
- 厳密な型チェック設定
- ESLint + TypeScript ESLintでコード品質管理
- 各プロジェクトに独自のtsconfig.json設定

## 命名規約
- ファイル名: kebab-case（例: auth.controller.ts）
- コンポーネント名: PascalCase（例: TeacherDashboard.tsx）
- 変数・関数名: camelCase
- 定数: UPPER_SNAKE_CASE
- TypeScript型: PascalCase

## プロジェクト構造
- **Backend**: MVC + サービス層アーキテクチャ
  - controllers/: ルートハンドラー
  - services/: ビジネスロジック
  - models/: データモデル（Prisma）
  - routes/: ルート定義
  - middleware/: ミドルウェア
  - websocket/: WebSocket処理
  - utils/: ユーティリティ関数

- **PC Client**: Electron + React構造
  - main/: メインプロセス（Node.js）
  - renderer/: レンダラープロセス（React）
  - preload/: プリロードスクリプト

- **Chrome Extension**: Chrome Extension構造
  - background/: バックグラウンドスクリプト
  - content/: コンテンツスクリプト
  - popup/: ポップアップUI
  - options/: オプションページ

## スタイリング
- TailwindCSSを全プロジェクトで使用
- PostCSSでビルド処理
- レスポンシブデザイン対応

## 状態管理
- Zustand for state management
- React Query for data fetching (PC Client)
- React Hook Form for form management