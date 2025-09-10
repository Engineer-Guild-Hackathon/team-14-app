# useProject.ts

## 役割
プロジェクト管理カスタムフック

## State
- `projects: Project[]` - プロジェクト一覧
- `activeProject: Project | null` - 選択中プロジェクト
- `loading: boolean` - 読み込み状態
- `error: string | null` - エラー情報

## 主要な関数
- `fetchProjects()` - プロジェクト一覧取得
- `addProject()` - プロジェクト追加
- `selectProject()` - プロジェクト選択
- `deleteProject()` - プロジェクト削除
- `updateProject()` - プロジェクト更新

## IPC通信
- メインプロセスとのプロジェクト操作