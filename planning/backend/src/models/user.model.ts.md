# user.model.ts

## Prismaスキーマ（更新版）
```prisma
model User {
  id                String                @id @default(uuid())
  email             String                @unique
  password          String
  name              String
  role              UserRole              @default(STUDENT)
  avatar            String?
  bio               String?
  isActive          Boolean               @default(true)
  
  // 学習関連
  projects          Project[]
  quests            Quest[]
  progress          Progress[]
  codeHistory       CodeHistory[]
  learningEvents    LearningEvent[]
  summitRecords     SummitRecord[]
  badgeAwards       BadgeAward[]
  
  // 教師機能
  teacherClassrooms Classroom[]           @relation("TeacherClassrooms")
  studentClassrooms ClassroomStudent[]    @relation("StudentClassrooms")
  
  // Social機能
  implementations   Implementation[]
  implLikes         ImplementationLike[]
  implComments      ImplementationComment[]
  implViews         ImplementationView[]
  
  // レビュー機能
  reviewRequests    ReviewRequest[]       @relation("ReviewRequests")
  reviewsGiven      Review[]              @relation("ReviewsGiven")
  
  // ポートフォリオ
  portfolio         Portfolio?
  
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  @@index([role])
  @@index([email])
}

enum UserRole {
  STUDENT
  TEACHER
  MENTOR
  ADMIN
}

model Portfolio {
  id          String            @id @default(uuid())
  userId      String            @unique
  title       String
  description String?
  isPublic    Boolean           @default(false)
  customUrl   String?           @unique
  theme       String            @default("default")
  user        User              @relation(fields: [userId], references: [id])
  entries     PortfolioEntry[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model PortfolioEntry {
  id           String         @id @default(uuid())
  portfolioId  String
  summitId     String         @unique
  order        Int
  isVisible    Boolean        @default(true)
  customTitle  String?
  customDesc   String?
  portfolio    Portfolio      @relation(fields: [portfolioId], references: [id])
  summitRecord SummitRecord   @relation(fields: [summitId], references: [id])
  createdAt    DateTime       @default(now())

  @@unique([portfolioId, order])
}
```

## 主要なメソッド
- `create()` - ユーザー作成
- `findByRole()` - ロール別ユーザー取得
- `getTeachingStats()` - 教師の指導統計
- `getLearningStats()` - 学習統計
- `updatePortfolio()` - ポートフォリオ更新