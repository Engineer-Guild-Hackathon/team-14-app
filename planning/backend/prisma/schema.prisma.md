# schema.prisma

## データベーススキーマ定義（完全版）

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// === コアエンティティ ===
model User {
  id                String                @id @default(uuid())
  email             String                @unique
  password          String
  name              String
  role              UserRole              @default(STUDENT)
  avatar            String?
  bio               String?
  isActive          Boolean               @default(true)
  
  // 基本学習機能
  projects          Project[]
  quests            Quest[]
  progress          Progress[]
  
  // 詳細学習追跡
  codeHistory       CodeHistory[]
  learningEvents    LearningEvent[]
  summitRecords     SummitRecord[]
  badgeAwards       BadgeAward[]
  
  // 教育機能
  teacherClassrooms Classroom[]           @relation("TeacherClassrooms")
  studentClassrooms ClassroomStudent[]    @relation("StudentClassrooms")
  
  // ソーシャル機能
  implementations   Implementation[]
  implLikes         ImplementationLike[]
  implComments      ImplementationComment[]
  
  // レビュー機能
  reviewRequests    ReviewRequest[]       @relation("ReviewRequests")
  reviewsGiven      Review[]              @relation("ReviewsGiven")
  
  // ポートフォリオ
  portfolio         Portfolio?
  
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
}

model Project {
  id          String        @id @default(uuid())
  name        String
  description String?
  localPath   String
  gitUrl      String?
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  quests      Quest[]
  codeHistory CodeHistory[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Quest {
  id              String          @id @default(uuid())
  title           String
  description     String
  articleUrl      String
  difficulty      Difficulty
  status          QuestStatus     @default(PENDING)
  steps           QuestStep[]
  userId          String
  projectId       String
  user            User            @relation(fields: [userId], references: [id])
  project         Project         @relation(fields: [projectId], references: [id])
  progress        Progress[]
  summitRecords   SummitRecord[]
  codeHistory     CodeHistory[]
  learningEvents  LearningEvent[]
  implementations Implementation[]
  assignments     Assignment[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

// === 教育機能 ===
model Classroom {
  id          String             @id @default(uuid())
  name        String
  description String?
  inviteCode  String             @unique
  teacherId   String
  teacher     User               @relation("TeacherClassrooms", fields: [teacherId], references: [id])
  students    ClassroomStudent[]
  assignments Assignment[]
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
}

// === ポートフォリオ・アチーブメント ===
model SummitRecord {
  id                String              @id @default(uuid())
  userId            String
  questId           String
  title             String
  description       String?
  reflection        String?
  codeSnapshot      Json
  beforeCode        Json?
  implementationTime Int
  articleUrl        String
  techStack         String[]
  isPublic          Boolean             @default(false)
  isPortfolio       Boolean             @default(false)
  user              User                @relation(fields: [userId], references: [id])
  quest             Quest               @relation(fields: [questId], references: [id])
  badges            BadgeAward[]
  implementation    Implementation?
  portfolioEntry    PortfolioEntry?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}

// === ソーシャル学習 ===
model Implementation {
  id             String                  @id @default(uuid())
  userId         String
  questId        String
  summitId       String                  @unique
  title          String
  description    String
  code           Json
  approach       String
  techStack      String[]
  difficulty     Int
  implementTime  Int
  articleUrl     String
  articleHash    String
  isAnonymous    Boolean                 @default(false)
  isPublic       Boolean                 @default(false)
  user           User                    @relation(fields: [userId], references: [id])
  quest          Quest                   @relation(fields: [questId], references: [id])
  summitRecord   SummitRecord            @relation(fields: [summitId], references: [id])
  likes          ImplementationLike[]
  comments       ImplementationComment[]
  reviewRequest  ReviewRequest?
  createdAt      DateTime                @default(now())
  updatedAt      DateTime                @updatedAt
}

// === Enums ===
enum UserRole {
  STUDENT
  TEACHER
  MENTOR
  ADMIN
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum QuestStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  ABANDONED
}

enum ChangeType {
  CREATE
  MODIFY
  DELETE
  RENAME
}

enum EventType {
  QUEST_START
  STEP_COMPLETE
  HINT_REQUEST
  ERROR_ENCOUNTER
  ARTICLE_REFERENCE
  CODE_VERIFY
  QUEST_COMPLETE
  BREAK_TAKEN
}
```

## 主要な機能ドメイン
1. **基本学習機能**: User, Project, Quest, Progress
2. **教育機能**: Classroom, Assignment, Teacher管理
3. **ポートフォリオ**: SummitRecord, Portfolio, Badge
4. **ソーシャル学習**: Implementation, Gallery, Like/Comment
5. **学習分析**: CodeHistory, LearningEvent, Analytics
6. **ピアレビュー**: ReviewRequest, Review, Comment