# ProjectCard.tsx

## 役割
プロジェクト表示カード

## Props
```typescript
interface Props {
  project: Project
  onSelect: (project: Project) => void
  onDelete: (projectId: string) => void
}
```

## 表示内容
- プロジェクト名
- 説明
- 最終更新日
- ファイル監視状態
- アクティブクエスト数

## アクション
- プロジェクト選択
- プロジェクト削除
- 設定編集