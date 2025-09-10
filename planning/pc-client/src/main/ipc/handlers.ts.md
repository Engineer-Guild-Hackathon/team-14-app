# handlers.ts

## 役割
IPC通信のハンドラー定義

## 主要な関数
- `selectDirectory()` - ディレクトリ選択ダイアログ
- `startFileWatcher()` - ファイル監視開始
- `stopFileWatcher()` - ファイル監視停止
- `getProjectInfo()` - プロジェクト情報取得
- `sendApiRequest()` - API通信

## IPCチャンネル
- 'select-directory'
- 'file-watcher-start'
- 'api-request'
- 'websocket-connect'