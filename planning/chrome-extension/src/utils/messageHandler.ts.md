# messageHandler.ts

## 役割
Chrome拡張内でのメッセージ通信管理

## 主要な関数
- `sendToBackground()` - バックグラウンドスクリプトへメッセージ送信
- `sendToContent()` - コンテンツスクリプトへメッセージ送信
- `sendToPopup()` - ポップアップへメッセージ送信
- `createMessageListener()` - メッセージリスナー作成

## メッセージ型
```typescript
type MessageType = 
  | 'GENERATE_QUEST'
  | 'UPDATE_PROGRESS' 
  | 'GET_TAB_INFO'
  | 'SAVE_SETTINGS'
```

## エラーハンドリング
- メッセージ送信失敗時のリトライ
- タイムアウト処理