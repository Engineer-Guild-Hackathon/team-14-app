# socketManager.ts

## 役割
WebSocket接続管理とリアルタイム通信

## 主要なクラス/関数
- `SocketManager` - WebSocket管理クラス
  - `initialize()` - 接続初期化
  - `handleConnection()` - 新規接続処理
  - `broadcastToProject()` - プロジェクト参加者へブロードキャスト
  - `emitProgressUpdate()` - 進捗更新通知

## イベント
- `connection` - 新規接続
- `join-project` - プロジェクトルーム参加
- `code-update` - コード更新通知
- `verification-result` - 検証結果通知
- `quest-completed` - クエスト完了通知

## 接続管理
- ユーザーIDとソケットIDのマッピング
- プロジェクトごとのルーム管理
- 認証済み接続のみ許可