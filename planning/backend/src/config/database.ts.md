# database.ts

## 役割
データベース接続管理

## 主要な関数
- `initializeDatabase()` - DB接続初期化
- `disconnect()` - 接続終了
- `checkConnection()` - 接続状態確認

## エクスポート
- `prisma` - Prismaクライアントインスタンス

## 環境変数
- DATABASE_URL - 接続文字列