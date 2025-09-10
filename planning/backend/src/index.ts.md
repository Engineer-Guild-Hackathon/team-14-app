# index.ts

## 役割
サーバーのエントリーポイント

## 主要な関数
- `startServer()` - サーバー起動
- `gracefulShutdown()` - グレースフルシャットダウン

## 依存関係
- app.ts を呼び出してExpressアプリを取得
- database.ts を呼び出してDB接続
- socketManager.ts を呼び出してWebSocket初期化