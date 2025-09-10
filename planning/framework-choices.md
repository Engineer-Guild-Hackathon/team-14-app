# フレームワーク選定

## PC Client (Electronアプリ)

### メインフレームワーク
- **Electron** - デスクトップアプリケーションフレームワーク
- **React** - UIライブラリ（レンダラープロセス）
- **TypeScript** - 型安全性の確保

### 主要ライブラリ
- **electron-builder** - アプリケーションのビルド・配布
- **electron-updater** - 自動更新機能
- **chokidar** - ファイル監視
- **simple-git** - Git操作（差分取得等）

### UI/スタイリング
- **Tailwind CSS** - ユーティリティファーストCSS
- **shadcn/ui** - UIコンポーネントライブラリ
- **React Hook Form** - フォーム管理
- **Zustand** - 状態管理

### 通信
- **Axios** - HTTP通信
- **Socket.io-client** - WebSocket通信

## Chrome Extension

### メインフレームワーク
- **Manifest V3** - Chrome拡張の最新仕様
- **React** - ポップアップUIの構築
- **TypeScript** - 型安全性の確保

### ビルドツール
- **Webpack** - バンドラー
- **CRXJS Vite Plugin** - Viteベースの拡張機能ビルド（代替案）

### 主要ライブラリ
- **Chrome Extension API** - ブラウザAPI
- **React Query** - データフェッチング・キャッシング
- **Zustand** - 状態管理（軽量）

### UI/スタイリング
- **Tailwind CSS** - コンパクトなスタイリング
- **Radix UI** - アクセシブルなUIコンポーネント
- **React DnD** - ドラッグ&ドロップ（コード並べ替え用）

## Backend (参考)

### メインフレームワーク
- **Node.js** - ランタイム
- **Express.js** - Webフレームワーク
- **TypeScript** - 型安全性

### データベース/ORM
- **Prisma** - TypeScript向けORM
- **PostgreSQL** - データベース

### リアルタイム通信
- **Socket.io** - WebSocketライブラリ

### その他
- **OpenAI SDK** - AI連携
- **JWT** - 認証トークン
- **bcrypt** - パスワードハッシュ化

## 共通ライブラリ (Shared)

### 型定義・ユーティリティ
- **TypeScript** - 共通型定義
- **Zod** - ランタイム型検証
- **date-fns** - 日付操作

## 選定理由

### Electron + React (PC Client)
- **クロスプラットフォーム対応**: Windows/Mac/Linux全対応
- **Webテクノロジーの活用**: フロントエンド開発者が開発しやすい
- **豊富なエコシステム**: ファイル監視、Git操作等のNode.jsライブラリが使用可能
- **ネイティブ機能へのアクセス**: ファイルシステム、システムトレイ等

### React + TypeScript (Chrome Extension)
- **コンポーネントベース**: UIの再利用性が高い
- **型安全性**: TypeScriptによる開発時エラー検出
- **軽量**: 拡張機能に適したバンドルサイズ
- **Chrome API統合**: TypeScript型定義で安全にAPI使用可能