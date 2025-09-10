# summit-record.model.ts

## Prismaスキーマ
```prisma
model SummitRecord {
  id              String    @id @default(uuid())
  userId          String
  questId         String
  title           String
  description     String?
  reflection      String?   // 学習振り返り
  codeSnapshot    Json      // 実装コードのスナップショット
  beforeCode      Json?     // 実装前のコード状態
  implementationTime Int    // 実装にかかった時間（分）
  articleUrl      String    // 参考にした記事URL
  techStack       String[]  // 使用技術
  isPublic        Boolean   @default(false)
  isPortfolio     Boolean   @default(false)
  user            User      @relation(fields: [userId], references: [id])
  quest           Quest     @relation(fields: [questId], references: [id])
  badges          BadgeAward[]
  likes           SummitLike[]
  comments        SummitComment[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Badge {
  id          String      @id @default(uuid())
  name        String      @unique
  description String
  icon        String
  condition   Json        // 獲得条件
  awards      BadgeAward[]
}

model BadgeAward {
  id           String      @id @default(uuid())
  userId       String
  badgeId      String
  summitId     String?
  user         User        @relation(fields: [userId], references: [id])
  badge        Badge       @relation(fields: [badgeId], references: [id])
  summitRecord SummitRecord? @relation(fields: [summitId], references: [id])
  awardedAt    DateTime    @default(now())

  @@unique([userId, badgeId])
}
```

## バッジ種類
- FirstSummit（初登頂）
- SpeedCoder（高速実装）
- ConsistentLearner（継続学習）
- TechExplorer（新技術挑戦）