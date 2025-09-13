# CodeClimb タスク完了時のワークフロー

## 開発作業完了時の必須チェック項目

### 1. コード品質チェック
```bash
# Backend
cd backend && npm run lint && npm run build

# PC Client  
cd pc-client && npm run lint && npm run typecheck && npm run build

# Chrome Extension
cd chrome-extension && npm run lint && npm run type-check && npm run build
```

### 2. テスト実行
```bash
# Backend（テストが実装されている場合）
cd backend && npm run test
```

### 3. ビルド確認
- すべてのプロジェクトでエラーなくビルドが完了すること
- TypeScript型エラーがないこと
- ESLintエラーがないこと

### 4. 機能テスト（必要に応じて）
- PC Clientアプリの動作確認
- Chrome拡張機能のロード・動作確認
- APIエンドポイントの動作確認

### 5. Git管理
- 適切なコミットメッセージ
- ブランチ管理（feature/*パターン推奨）
- プルリクエスト前の最終チェック

## CLAUDE.mdの指示
- iPhone18.5シミュレーターでのUI確認
- Issue粒度の細分化
- ラベル付け（backend, frontend, PC client, Chrome extension）
- ビルドエラーなしでのPR作成

## 重要な注意点
- 各プロジェクトは独立してビルド・テスト可能
- 全プロジェクトでTypeScript + ESLint + TailwindCSSを使用
- 本格実装前に必ずplanningディレクトリの仕様書確認