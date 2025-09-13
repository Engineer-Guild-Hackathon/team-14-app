# CodeClimb 開発コマンド

## Backend 開発コマンド
```bash
cd backend
npm run dev          # 開発サーバー起動（tsx watch）
npm run build        # TypeScriptビルド
npm run start        # プロダクションサーバー起動
npm run test         # Jestテスト実行
npm run test:watch   # Jestテスト監視モード
npm run lint         # ESLintチェック
npm run lint:fix     # ESLint自動修正
npm run prisma:generate  # Prisma クライアント生成
npm run prisma:migrate   # データベースマイグレーション
npm run prisma:studio    # Prisma Studio起動
```

## PC Client 開発コマンド
```bash
cd pc-client
npm run dev          # 開発モード（Electronアプリ起動）
npm run build        # プロダクションビルド
npm run build:watch  # 監視モードでビルド
npm run lint         # ESLintチェック
npm run lint:fix     # ESLint自動修正
npm run typecheck    # TypeScript型チェック
npm run electron:pack    # Electronアプリパッケージ
npm run electron:dist    # 配布用ビルド
```

## Chrome Extension 開発コマンド
```bash
cd chrome-extension
npm run dev          # 開発モード（Webpack監視）
npm run build        # プロダクションビルド
npm run build:dev    # 開発用ビルド
npm run clean        # distディレクトリクリア
npm run lint         # ESLintチェック
npm run lint:fix     # ESLint自動修正
npm run type-check   # TypeScript型チェック
```

## システムコマンド（macOS）
```bash
ls -la               # ファイル一覧表示
find . -name "*.ts"  # TypeScriptファイル検索
grep -r "pattern"    # パターン検索
git status           # Git状態確認
git log --oneline    # コミット履歴確認
```