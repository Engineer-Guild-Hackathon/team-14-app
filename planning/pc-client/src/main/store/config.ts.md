# config.ts

## 役割
アプリケーション設定管理

## 設定項目
- ユーザー設定（ログイン情報、トークン等）
- プロジェクト設定（監視対象、除外パターン等）
- UI設定（テーマ、言語等）

## 主要な関数
- `loadConfig()` - 設定読み込み
- `saveConfig()` - 設定保存
- `getProjectConfig()` - プロジェクト設定取得
- `updateUserSettings()` - ユーザー設定更新

## ストレージ
- electron-store を使用
- JSON形式での設定保存