# SummitRecordButton.tsx

## 役割
「登頂記録に追加」ワンクリックボタン

## Props
```typescript
interface Props {
  questId: string
  isCompleted: boolean
  onSummitRecorded: (summitId: string) => void
}
```

## 機能
- クエスト完了時に表示される「登頂成功！」UI
- ワンクリックで登頂記録作成
- 実装コードの自動スナップショット
- 学習振り返りメモの入力フォーム
- ポートフォリオ公開/非公開の選択

## State
- `isRecording: boolean` - 記録作成中
- `reflection: string` - 学習振り返りメモ
- `isPublic: boolean` - 公開設定
- `badgeAwarded: Badge | null` - 獲得バッジ

## UI要素
- 登山のビジュアルエフェクト
- バッジ獲得アニメーション
- 成功メッセージとシェア機能

## ワンクリックフロー
1. ボタンクリック
2. コードスナップショット自動取得
3. 学習データの整理
4. 登頂記録の生成
5. バッジ判定・付与
6. 完了通知