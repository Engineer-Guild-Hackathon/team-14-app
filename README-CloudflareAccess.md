# Cloudflare Access 設定ガイド

## 概要

このプロジェクトは Cloudflare Access を使用してバックエンド API へのアクセスを保護しています。

## 設定情報

### バックエンドドメイン
- **ドメイン**: `codeclimb.omori.f5.si`
- **API URL**: `https://codeclimb.omori.f5.si/api`
- **WebSocket URL**: `https://codeclimb.omori.f5.si`

### Cloudflare Access 認証情報
- **Client ID**: `867ff0dd303ae2bf7b6f8cf0d88b0374.access`
- **Client Secret**: `27eae7ab520da49391f99d4c66bf2a14635f567c5f6b62410d7327622d1a4d34`

## 環境変数設定

### PC Client (.env)
```bash
# Backend API Configuration
VITE_API_URL=https://codeclimb.omori.f5.si/api
VITE_WS_URL=https://codeclimb.omori.f5.si
VITE_BACKEND_DOMAIN=codeclimb.omori.f5.si

# Cloudflare Access Configuration
VITE_CF_ACCESS_CLIENT_ID=867ff0dd303ae2bf7b6f8cf0d88b0374.access
VITE_CF_ACCESS_CLIENT_SECRET=27eae7ab520da49391f99d4c66bf2a14635f567c5f6b62410d7327622d1a4d34
```

### Docker Environment (.env.docker)
```bash
# Backend Domain Configuration
BACKEND_DOMAIN=codeclimb.omori.f5.si
BACKEND_URL=https://codeclimb.omori.f5.si

# Cloudflare Access Configuration
CF_ACCESS_CLIENT_ID=867ff0dd303ae2bf7b6f8cf0d88b0374.access
CF_ACCESS_CLIENT_SECRET=27eae7ab520da49391f99d4c66bf2a14635f567c5f6b62410d7327622d1a4d34
```

## API サービス設定

### API リクエストヘッダー
全ての API リクエストに以下のヘッダーが自動的に追加されます：

```javascript
{
  'CF-Access-Client-Id': '867ff0dd303ae2bf7b6f8cf0d88b0374.access',
  'CF-Access-Client-Secret': '27eae7ab520da49391f99d4c66bf2a14635f567c5f6b62410d7327622d1a4d34',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer <token>' // 認証トークンがある場合
}
```

## WebSocket 接続設定

WebSocket 接続時にも Cloudflare Access ヘッダーが含まれます：

```javascript
const socketOptions = {
  auth: { token: authToken },
  transports: ['websocket'],
  timeout: 10000,
  extraHeaders: {
    'CF-Access-Client-Id': cfAccessClientId,
    'CF-Access-Client-Secret': cfAccessClientSecret
  }
};
```

## 使用方法

### API サービスの使用
```javascript
import { apiService } from './services/api.service';

// 自動的に Cloudflare Access ヘッダーが追加されます
const user = await apiService.getCurrentUser();
const projects = await apiService.getProjects();
```

### WebSocket サービスの使用
```javascript
import { webSocketService } from './services/websocket.service';

// 自動的に Cloudflare Access ヘッダーが追加されます
webSocketService.connect(authToken, {
  onConnect: () => console.log('WebSocket connected'),
  onDisconnect: () => console.log('WebSocket disconnected')
});
```

## トラブルシューティング

### 接続エラーの場合
1. 環境変数が正しく設定されているか確認
2. Cloudflare Access の設定が有効か確認
3. ドメインが正しく解決されるか確認

### 認証エラーの場合
1. Client ID と Client Secret が正しいか確認
2. Cloudflare Access ポリシーが適切に設定されているか確認

## セキュリティ注意事項

⚠️ **重要**: Client Secret は機密情報です。本番環境では以下に注意してください：

1. 環境変数ファイルを Git にコミットしない
2. CI/CD パイプラインで環境変数を安全に管理する
3. 定期的に認証情報をローテーションする
4. アクセスログを監視する

## 更新履歴

- 2024-09-20: 初期設定完了
  - バックエンドドメイン設定: `codeclimb.omori.f5.si`
  - Cloudflare Access 認証情報設定
  - API サービスとWebSocketサービスの統合