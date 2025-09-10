# index.tsx (options)

## 役割
Chrome拡張の設定ページ

## 設定項目
- APIエンドポイント設定
- 認証情報設定
- 自動解析設定（記事自動判定等）
- 通知設定

## コンポーネント
- APISettingsForm - API設定フォーム
- NotificationSettings - 通知設定
- AccountSettings - アカウント設定
- ExportImport - 設定のエクスポート/インポート

## ストレージ
- chrome.storage.sync を使用
- 複数デバイス間で同期