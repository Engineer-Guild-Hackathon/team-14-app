# App.tsx (Popup)

## 役割
Chrome拡張のポップアップUI

## 画面フロー
1. プロジェクト未選択 → ProjectSelector
2. プロジェクト選択済み → QuestForm
3. クエスト生成中 → LoadingState
4. クエスト実行中 → QuestStep表示

## コンポーネント構成
- ProjectSelector - プロジェクト選択
- QuestForm - クエスト生成フォーム
- QuestStep - 現在のステップ表示
- CodeArrangement - コード並べ替えUI
- ProgressIndicator - 進捗表示

## State
- `selectedProject: Project | null`
- `currentQuest: Quest | null`
- `currentStep: number`
- `isLoading: boolean`

## 主要な関数
- `generateQuest()` - クエスト生成リクエスト
- `submitArrangement()` - 並べ替え回答送信
- `checkVerification()` - 検証結果確認

## Chrome API使用
- chrome.storage.local - データ保存
- chrome.tabs.query - 現在のタブ取得
- chrome.runtime.sendMessage - Background通信