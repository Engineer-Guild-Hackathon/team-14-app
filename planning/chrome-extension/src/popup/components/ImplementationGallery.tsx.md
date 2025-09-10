# ImplementationGallery.tsx

## 役割
「絶景」実装ギャラリー表示

## Props
```typescript
interface Props {
  articleUrl: string
  currentImplementation?: Implementation
}
```

## 機能
- 同じ記事から作られた他の実装例表示
- 異なるアプローチの比較表示
- 実装へのいいね・コメント機能
- フォローしている学習者の実装優先表示

## 表示要素
- 実装のサムネイル（コードプレビュー）
- 使用技術タグ
- 実装時間・難易度
- いいね数・コメント数
- 作者情報（匿名可）

## インタラクション
- 実装詳細のモーダル表示
- コードのコピー機能
- 「これも試してみる」ボタン（クエスト追加）
- 実装者へのメッセージ送信

## State
- `implementations: Implementation[]`
- `selectedImpl: Implementation | null`
- `filter: 'popular' | 'recent' | 'following'`
- `showDetails: boolean`

## インスピレーション機能
- 他の実装を見て新しいアプローチを発見
- 学習モチベーション向上