# peer-review.model.ts

## Prismaスキーマ
```prisma
model ReviewRequest {
  id               String    @id @default(uuid())
  requesterId      String
  implementationId String
  title            String
  description      String
  specificAreas    String[]  // レビューしてほしい箇所
  status           ReviewStatus @default(OPEN)
  requester        User      @relation("ReviewRequests", fields: [requesterId], references: [id])
  implementation   Implementation @relation(fields: [implementationId], references: [id])
  reviews          Review[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([status])
}

model Review {
  id              String        @id @default(uuid())
  reviewerId      String
  requestId       String
  overallRating   Int           @range(1, 5)
  readability     Int           @range(1, 5)
  approach        Int           @range(1, 5)
  performance     Int           @range(1, 5)
  security        Int           @range(1, 5)
  generalComment  String
  codeComments    ReviewComment[]
  improvements    String[]      // 改善提案
  goodPoints      String[]      // 良い点
  isHelpful       Boolean?      // 要求者による評価
  reviewer        User          @relation("ReviewsGiven", fields: [reviewerId], references: [id])
  request         ReviewRequest @relation(fields: [requestId], references: [id])
  createdAt       DateTime      @default(now())

  @@unique([reviewerId, requestId])
}

model ReviewComment {
  id         String @id @default(uuid())
  reviewId   String
  filePath   String
  lineNumber Int
  comment    String
  suggestion String?
  review     Review @relation(fields: [reviewId], references: [id])
}

enum ReviewStatus {
  OPEN
  IN_REVIEW
  COMPLETED
  CLOSED
}
```

## 主要なメソッド
- `createReviewRequest()` - レビュー依頼作成
- `assignReviewer()` - レビュアーのマッチング
- `submitReview()` - レビュー提出
- `rateReview()` - レビューの評価