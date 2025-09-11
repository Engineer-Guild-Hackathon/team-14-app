# implementation-gallery.model.ts

**⚠️ Phase2以降に保留 - 今はやらない**

## Prismaスキーマ
```prisma
model Implementation {
  id             String    @id @default(uuid())
  userId         String
  questId        String
  summitId       String    @unique
  title          String
  description    String
  code           Json      // 実装コード
  approach       String    // 実装アプローチの説明
  techStack      String[]  // 使用技術
  difficulty     Int       @range(1, 5)
  implementTime  Int       // 実装時間（分）
  articleUrl     String    // 元記事URL
  articleHash    String    // 記事のハッシュ（同記事判定用）
  isAnonymous    Boolean   @default(false)
  isPublic       Boolean   @default(false)
  user           User      @relation(fields: [userId], references: [id])
  quest          Quest     @relation(fields: [questId], references: [id])
  summitRecord   SummitRecord @relation(fields: [summitId], references: [id])
  likes          ImplementationLike[]
  comments       ImplementationComment[]
  views          ImplementationView[]
  tags           ImplementationTag[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([articleHash])
  @@index([createdAt])
}

model ImplementationLike {
  id               String         @id @default(uuid())
  userId           String
  implementationId String
  user             User           @relation(fields: [userId], references: [id])
  implementation   Implementation @relation(fields: [implementationId], references: [id])
  createdAt        DateTime       @default(now())

  @@unique([userId, implementationId])
}

model ImplementationComment {
  id               String         @id @default(uuid())
  userId           String
  implementationId String
  content          String
  parentId         String?        // 返信先コメント
  user             User           @relation(fields: [userId], references: [id])
  implementation   Implementation @relation(fields: [implementationId], references: [id])
  parent           ImplementationComment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies          ImplementationComment[] @relation("CommentReplies")
  createdAt        DateTime       @default(now())
}

model ImplementationTag {
  id               String         @id @default(uuid())
  implementationId String
  tag              String
  implementation   Implementation @relation(fields: [implementationId], references: [id])

  @@unique([implementationId, tag])
}
```

## 主要なメソッド
- `getByArticle()` - 同記事からの実装一覧
- `getFeatured()` - 注目の実装
- `likeImplementation()` - いいね追加
- `addComment()` - コメント追加