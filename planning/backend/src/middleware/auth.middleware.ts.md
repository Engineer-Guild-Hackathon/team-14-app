# auth.middleware.ts

## 役割
JWT認証ミドルウェア

## 主要な関数
- `authenticateToken()` - JWTトークン検証
- `authorizeRoles()` - ロール別認可
- `rateLimiter()` - API呼び出し制限

## 処理フロー
1. Authorizationヘッダーから取得
2. JWT検証
3. ユーザー情報をreq.userに設定