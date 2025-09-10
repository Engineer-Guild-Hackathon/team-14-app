# index.ts (preload)

## 役割
プリロードスクリプト（メイン-レンダラー間のブリッジ）

## exposeInMainWorld
```typescript
window.electronAPI = {
  selectDirectory: () => Promise<string>
  startFileWatcher: (projectPath: string) => void
  stopFileWatcher: (projectId: string) => void
  onFileChange: (callback: Function) => void
  apiRequest: (url: string, options: RequestOptions) => Promise<any>
  openExternal: (url: string) => void
}
```

## セキュリティ
- contextIsolation有効
- nodeIntegration無効
- 安全なAPIのみ公開