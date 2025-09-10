# fileSync.handler.ts

## 役割
ファイル同期WebSocketハンドラー

## 主要な関数
- `handleFileChange()` - ファイル変更イベント処理
- `handleVerificationRequest()` - 検証リクエスト処理
- `broadcastToProject()` - プロジェクト参加者への通知

## イベント
- `file-changed` - ファイル変更通知
- `verification-result` - 検証結果送信
- `project-sync` - プロジェクト状態同期