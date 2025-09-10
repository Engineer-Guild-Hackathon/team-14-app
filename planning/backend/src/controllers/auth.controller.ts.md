# auth.controller.ts

## エンドポイント
- `POST /api/auth/register` - 新規登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/refresh` - トークンリフレッシュ
- `POST /api/auth/logout` - ログアウト

## 主要な関数
- `register()` - ユーザー登録処理
- `login()` - ログイン処理
- `refreshToken()` - トークン更新
- `logout()` - ログアウト処理

## リクエスト/レスポンス
- register: `{ email, password, name }` → `{ user, token }`
- login: `{ email, password }` → `{ user, token, refreshToken }`

## 依存関係
- auth.service.ts を呼び出して認証ロジック実行
- JWT生成・検証