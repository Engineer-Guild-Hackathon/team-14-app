# CodeArrangement.tsx

## 役割
コードブロック並べ替えパズルUI

## 機能
- ドラッグ&ドロップでコードブロック並べ替え
- 正解判定とフィードバック表示
- ヒント表示機能

## Props
```typescript
interface Props {
  blocks: CodeBlock[]
  onSubmit: (arrangement: string[]) => void
  hint?: string
}
```

## State
- `arrangedBlocks: CodeBlock[]`
- `isDragging: boolean`
- `draggedItem: CodeBlock | null`

## 主要な関数
- `handleDragStart()` - ドラッグ開始
- `handleDragOver()` - ドラッグオーバー
- `handleDrop()` - ドロップ処理
- `submitArrangement()` - 並べ替え結果送信

## ライブラリ
- react-beautiful-dnd または独自実装