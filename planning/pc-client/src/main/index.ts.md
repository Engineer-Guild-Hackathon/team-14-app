# index.ts (メインプロセス)

## 役割
Electronアプリのメインプロセス

## 主要な関数
- `createWindow()` - メインウィンドウ作成
- `setupIPC()` - IPCハンドラー設定
- `handleDeepLink()` - ディープリンク処理
- `checkForUpdates()` - 自動更新チェック

## アプリイベント
- `ready` - アプリ起動時
- `window-all-closed` - 全ウィンドウ閉じた時
- `activate` - アプリアクティベート時

## 依存関係
- ipc/handlers.ts のIPCハンドラー
- services/fileWatcher.ts のファイル監視
- store/config.ts の設定管理