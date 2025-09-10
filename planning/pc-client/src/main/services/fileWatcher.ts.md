# fileWatcher.ts

## 役割
プロジェクトファイルの変更監視とリアルタイム同期

## 主要なクラス/関数
- `FileWatcher` クラス
  - `startWatching()` - 監視開始
  - `stopWatching()` - 監視停止
  - `onFileChange()` - ファイル変更イベント
  - `getFileDiff()` - 差分取得
  - `sendUpdate()` - バックエンドへ更新送信

## プロパティ
- `watchedProjects: Map<projectId, FSWatcher>`
- `ignorePatterns: string[]` - 無視パターン(.git, node_modules等)
- `debounceTime: number` - デバウンス時間

## 監視対象
- ソースコードファイル
- 設定ファイル
- package.json等の依存関係ファイル

## 依存関係
- chokidar (ファイル監視)
- gitService.ts (Git差分取得)
- apiClient.ts (バックエンド通信)