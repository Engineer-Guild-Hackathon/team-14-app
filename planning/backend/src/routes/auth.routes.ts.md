# auth.routes.ts

## 役割
認証関連のルート定義

## ルート定義
```typescript
router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/refresh', authController.refreshToken)
router.post('/logout', authMiddleware, authController.logout)
```

## ミドルウェア
- バリデーション（email, password）
- レート制限
- 認証チェック（logout用）