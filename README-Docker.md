# CodeClimb Docker セットアップ

このドキュメントでは、DockerとDocker Composeを使用してCodeClimbバックエンドを簡単に起動する方法を説明します。

## 必要な環境

- Docker（20.10+）
- Docker Compose（2.0+）
- Make（オプション、コマンド実行の簡略化）

## クイックスタート

### 1. 環境変数の設定

```bash
cp .env.docker .env
```

`.env`ファイルを編集して、以下の値を実際の値に変更してください：

```bash
# 必須: OpenAI API Key
OPENAI_API_KEY=your-actual-openai-api-key

# 必須: JWT Secrets（本番環境では強力なランダム文字列に変更）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# オプション: Chrome Extension ID
CHROME_EXTENSION_ID=your-chrome-extension-id
```

### 2. アプリケーションの起動

#### 本番環境
```bash
# Makeを使用する場合
make up

# または直接docker-composeを使用
docker-compose --env-file .env up -d
```

#### 開発環境（ホットリロード付き）
```bash
# Makeを使用する場合
make up-dev

# または直接docker-composeを使用
docker-compose -f docker-compose.dev.yml --env-file .env up -d
```

### 3. アクセス

- **Backend API**: http://localhost:3000
- **Database**: localhost:5432 (postgres)
- **Redis**: localhost:6379

## 利用可能なコマンド

### Make コマンド（推奨）

```bash
make help          # ヘルプを表示
make build         # Dockerイメージをビルド
make up            # 本番環境を起動
make up-dev        # 開発環境を起動
make down          # 全コンテナを停止
make logs          # 全ログを表示
make migrate       # データベースマイグレーション実行
make seed          # サンプルデータを挿入
make shell         # バックエンドコンテナにシェルアクセス
make db-shell      # PostgreSQLシェルアクセス
make clean         # 全コンテナとボリュームを削除（注意！）
make health        # 健康状態チェック
```

### Docker Compose コマンド

```bash
# サービス起動
docker-compose --env-file .env up -d

# 開発環境起動
docker-compose -f docker-compose.dev.yml --env-file .env up -d

# ログ確認
docker-compose logs -f backend

# サービス停止
docker-compose down

# データベースマイグレーション
docker-compose exec backend npx prisma migrate deploy

# データベースシード
docker-compose exec backend npx prisma db seed
```

## サービス構成

### 本番環境 (docker-compose.yml)
- **backend**: Node.js API サーバー
- **db**: PostgreSQL データベース
- **redis**: Redis キャッシュ
- **db-migrate**: データベースマイグレーション（一回のみ実行）

### 開発環境 (docker-compose.dev.yml)
- **backend-dev**: ホットリロード付きNode.js API サーバー
- **db**: PostgreSQL データベース
- **redis**: Redis キャッシュ

## データベースアクセス

### サンプルユーザー
データベースシード後、以下のユーザーでテストできます：

- **管理者**: admin@codeclimb.dev (password: admin123)
- **教師**: teacher@codeclimb.dev (password: teacher123)
- **学生**: student@codeclimb.dev (password: student123)

### PostgreSQL直接アクセス
```bash
# シェルアクセス
make db-shell

# または
docker-compose exec db psql -U codeclimb_user -d codeclimb
```

## 開発での利用

### ホットリロード
開発環境では、`./backend`ディレクトリの変更が自動的にコンテナに反映されます。

### デバッグ
開発環境では、デバッグポート9229が公開されているため、IDEからリモートデバッグが可能です。

### ログ監視
```bash
# 全ログ
make logs

# バックエンドのみ
make logs-backend
```

## トラブルシューティング

### ポート競合
既にポート3000、5432、6379が使用されている場合は、docker-compose.ymlのポート設定を変更してください。

### データベース接続エラー
1. データベースコンテナが正常に起動しているか確認
   ```bash
   docker-compose ps
   ```

2. データベースのヘルスチェックを確認
   ```bash
   docker-compose logs db
   ```

### 権限エラー
Dockerを使用する際に権限エラーが発生する場合：
```bash
sudo usermod -aG docker $USER
# 再ログイン後に実効
```

### データ初期化
データをクリーンな状態に戻したい場合：
```bash
make clean  # 注意: 全データが削除されます
make up
make seed
```

## 本番運用での注意事項

1. **セキュリティ**
   - JWT_SECRETとJWT_REFRESH_SECRETを強力なランダム文字列に変更
   - データベースのパスワードを変更
   - 必要に応じてファイアウォール設定

2. **バックアップ**
   - PostgreSQLデータの定期バックアップを設定
   - アップロードファイルのバックアップ

3. **監視**
   - ヘルスチェックエンドポイントの監視
   - ログの定期的な確認

4. **スケーリング**
   - 必要に応じてコンテナのリソース制限を調整
   - ロードバランサーの設定（複数インスタンス運用時）