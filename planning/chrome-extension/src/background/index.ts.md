# index.ts (background)

## 役割
Chrome拡張のバックグラウンドスクリプト（Service Worker）

## 主要な関数
- `handleInstalled()` - インストール時の初期化
- `handleMessage()` - ポップアップからのメッセージ処理
- `handleTabUpdate()` - タブ更新監視
- `syncWithBackend()` - バックエンドAPI連携

## イベントリスナー
- chrome.runtime.onInstalled
- chrome.runtime.onMessage
- chrome.tabs.onUpdated
- chrome.storage.onChanged

## 機能
- API通信代行
- ストレージ管理
- タブ情報取得