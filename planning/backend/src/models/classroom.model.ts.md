# classroom.model.ts

## Prismaスキーマ
```prisma
model Classroom {
  id          String @id @default(uuid())
  name        String
  description String?
  inviteCode  String @unique
  teacherId   String
  teacher     User   @relation("TeacherClassrooms", fields: [teacherId], references: [id])
  students    ClassroomStudent[]
  assignments Assignment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ClassroomStudent {
  id          String    @id @default(uuid())
  classroomId String
  studentId   String
  classroom   Classroom @relation(fields: [classroomId], references: [id])
  student     User      @relation("StudentClassrooms", fields: [studentId], references: [id])
  joinedAt    DateTime  @default(now())
  isActive    Boolean   @default(true)

  @@unique([classroomId, studentId])
}

model Assignment {
  id          String      @id @default(uuid())
  classroomId String
  questId     String
  title       String
  instruction String
  dueDate     DateTime?
  classroom   Classroom   @relation(fields: [classroomId], references: [id])
  quest       Quest       @relation(fields: [questId], references: [id])
  submissions Submission[]
  createdAt   DateTime    @default(now())
}
```

## 主要なメソッド
- `create()` - クラスルーム作成
- `addStudent()` - 生徒追加
- `assignQuest()` - 課題配布
- `getClassroomStats()` - クラス統計取得