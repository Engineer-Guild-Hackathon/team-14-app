# manifest.json

## 設定内容
```json
{
  "manifest_version": 3,
  "name": "CodeClimb Navigator",
  "version": "1.0.0",
  "permissions": [
    "activeTab",
    "storage",
    "tabs"
  ],
  "background": {
    "service_worker": "background/index.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/index.js"]
  }],
  "action": {
    "default_popup": "popup/index.html"
  }
}
```

## 権限
- activeTab: 現在のタブ情報取得
- storage: ローカルストレージ使用
- tabs: タブ操作

## コンポーネント
- Background Service Worker
- Content Script
- Popup UI