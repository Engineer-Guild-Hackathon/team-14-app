import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@codeclimb.dev' },
    update: {},
    create: {
      email: 'admin@codeclimb.dev',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      bio: 'System Administrator',
    },
  });

  // Create teacher user
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@codeclimb.dev' },
    update: {},
    create: {
      email: 'teacher@codeclimb.dev',
      password: teacherPassword,
      name: 'Teacher User',
      role: 'TEACHER',
      bio: 'Programming Instructor',
    },
  });

  // Create student user
  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@codeclimb.dev' },
    update: {},
    create: {
      email: 'student@codeclimb.dev',
      password: studentPassword,
      name: 'Student User',
      role: 'STUDENT',
      bio: 'Eager to learn programming',
    },
  });

  // Create sample project
  const sampleProject = await prisma.project.upsert({
    where: { id: 'sample-project-1' },
    update: {},
    create: {
      id: 'sample-project-1',
      name: 'My First React App',
      description: 'Learning React fundamentals',
      path: '/projects/react-app',
      language: 'typescript',
      framework: 'react',
      userId: student.id,
      isActive: true,
    },
  });

  // Create sample badges
  const badges = [
    {
      name: 'First Steps',
      description: 'Complete your first quest',
      icon: '🚀',
      category: 'ACHIEVEMENT',
      rarity: 'COMMON',
    },
    {
      name: 'Code Master',
      description: 'Write 1000 lines of code',
      icon: '💻',
      category: 'SKILL',
      rarity: 'RARE',
    },
    {
      name: 'Bug Hunter',
      description: 'Fix your first bug',
      icon: '🐛',
      category: 'ACHIEVEMENT',
      rarity: 'COMMON',
    },
  ];

  for (const badgeData of badges) {
    await prisma.badge.upsert({
      where: { name: badgeData.name },
      update: {},
      create: badgeData,
    });
  }

  console.log('Database seeded successfully!');
  console.log(`Admin user: admin@codeclimb.dev (password: admin123)`);
  console.log(`Teacher user: teacher@codeclimb.dev (password: teacher123)`);
  console.log(`Student user: student@codeclimb.dev (password: student123)`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });