# code-history.model.ts

## Prismaスキーマ
```prisma
model CodeHistory {
  id          String    @id @default(uuid())
  userId      String
  questId     String
  projectId   String
  filePath    String
  changeType  ChangeType
  beforeCode  String?
  afterCode   String?
  diff        Json      // 詳細な差分情報
  lineNumbers Json      // 変更行番号
  errorCount  Int       @default(0)
  user        User      @relation(fields: [userId], references: [id])
  quest       Quest     @relation(fields: [questId], references: [id])
  project     Project   @relation(fields: [projectId], references: [id])
  createdAt   DateTime  @default(now())

  @@index([userId, questId])
  @@index([createdAt])
}

model LearningEvent {
  id          String    @id @default(uuid())
  userId      String
  questId     String?
  eventType   EventType
  eventData   Json      // イベント詳細データ
  duration    Int?      // イベント持続時間
  user        User      @relation(fields: [userId], references: [id])
  quest       Quest?    @relation(fields: [questId], references: [id])
  createdAt   DateTime  @default(now())

  @@index([userId])
  @@index([createdAt])
}

enum ChangeType {
  CREATE
  MODIFY
  DELETE
  RENAME
}

enum EventType {
  QUEST_START      // クエスト開始
  STEP_COMPLETE    // ステップ完了
  HINT_REQUEST     // ヒント要求
  ERROR_ENCOUNTER  // エラー遭遇
  ARTICLE_REFERENCE // 記事参照
  CODE_VERIFY      // コード検証
  QUEST_COMPLETE   // クエスト完了
  BREAK_TAKEN      // 休憩
}
```

## 主要なメソッド
- `recordCodeChange()` - コード変更記録
- `recordLearningEvent()` - 学習イベント記録
- `getEditingPattern()` - 編集パターン分析
- `getLearningTimeline()` - 学習タイムライン取得