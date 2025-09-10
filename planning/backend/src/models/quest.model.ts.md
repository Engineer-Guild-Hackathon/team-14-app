# quest.model.ts

## Prismaスキーマ
```prisma
model Quest {
  id            String
  userId        String
  projectId     String
  articleUrl    String
  title         String
  description   String
  difficulty    String // easy, medium, hard
  status        String // pending, in_progress, completed
  steps         QuestStep[]
  createdAt     DateTime
  updatedAt     DateTime
}

model QuestStep {
  id            String
  questId       String
  stepNumber    Int
  type          String // code_arrangement, implementation, refactoring
  instruction   String
  expectedCode  String?
  hint          String?
  completed     Boolean
}
```

## 主要なメソッド
- `create()` - クエスト作成
- `findByUserId()` - ユーザーのクエスト取得
- `updateStatus()` - ステータス更新
- `addStep()` - ステップ追加

## リレーション
- User (多対1)
- Project (多対1)
- QuestStep (1対多)
- Progress (1対多)