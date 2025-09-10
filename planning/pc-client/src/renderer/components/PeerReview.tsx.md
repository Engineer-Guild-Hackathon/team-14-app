# PeerReview.tsx

## 役割
学習者同士のピアレビュー機能

## Props
```typescript
interface Props {
  implementationId: string
  mode: 'review' | 'request'
}
```

## 機能
- 実装コードのレビュー依頼
- レビューの実施・フィードバック提供
- レビューポイント（改善点・良い点）の可視化
- レビュー履歴の管理

## レビュー項目
- コードの可読性
- 実装アプローチの適切性
- エラーハンドリング
- パフォーマンス
- セキュリティ考慮

## State
- `reviewRequest: ReviewRequest`
- `reviews: Review[]`
- `myReview: Review | null`
- `reviewPoints: number`

## インタラクション
- コード行単位でのコメント
- 改善提案の投稿
- レビューへの返信
- 「参考になった」評価

## ゲーミフィケーション
- レビュー投稿でポイント獲得
- 高評価レビューでバッジ獲得
- レビュー品質ランキング