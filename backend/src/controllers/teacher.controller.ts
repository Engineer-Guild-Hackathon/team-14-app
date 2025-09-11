import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export class TeacherController {
  
  async getDashboard(req: Request, res: Response) {
    try {
      const teacherId = req.user?.userId;
      
      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 教師の担当クラス情報
      const classrooms = await prisma.classroom.findMany({
        where: { teacherId },
        include: {
          students: {
            include: {
              student: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          assignments: {
            include: {
              quest: {
                select: { title: true, difficulty: true }
              }
            }
          }
        }
      });

      // 全生徒の進捗状況
      const allStudentIds = classrooms.flatMap(c => 
        c.students.map(s => s.student.id)
      );

      const recentProgress = await prisma.progress.findMany({
        where: {
          userId: { in: allStudentIds },
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 過去7日
          }
        },
        include: {
          user: { select: { name: true, email: true } },
          quest: { select: { title: true, difficulty: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      });

      // つまずいている生徒（進捗が停滞）
      const studentsInNeed = await prisma.progress.findMany({
        where: {
          userId: { in: allStudentIds },
          status: 'IN_PROGRESS',
          updatedAt: {
            lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2日以上更新なし
          }
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          quest: { select: { title: true, difficulty: true } }
        }
      });

      // 統計情報
      const stats = {
        totalClasses: classrooms.length,
        totalStudents: allStudentIds.length,
        studentsInNeed: studentsInNeed.length,
        activeQuests: await prisma.progress.count({
          where: {
            userId: { in: allStudentIds },
            status: 'IN_PROGRESS'
          }
        }),
        completedQuests: await prisma.progress.count({
          where: {
            userId: { in: allStudentIds },
            status: 'COMPLETED'
          }
        })
      };

      return res.json({
        success: true,
        data: {
          classrooms,
          recentProgress,
          studentsInNeed,
          stats
        }
      });

    } catch (error) {
      console.error('Teacher dashboard error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getStudentProgress(req: Request, res: Response) {
    try {
      const teacherId = req.user?.userId;
      const studentId = req.params.id;

      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 教師がこの生徒を担当しているか確認
      const isAuthorized = await prisma.classroomStudent.findFirst({
        where: {
          studentId,
          classroom: { teacherId }
        }
      });

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Not authorized to view this student' });
      }

      // 生徒の詳細進捗
      const progress = await prisma.progress.findMany({
        where: { userId: studentId },
        include: {
          quest: {
            select: { title: true, difficulty: true, articleUrl: true }
          },
          stepProgress: {
            include: {
              step: { select: { title: true, stepNumber: true } }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // 学習イベント履歴
      const learningEvents = await prisma.learningEvent.findMany({
        where: { userId: studentId },
        include: {
          quest: { select: { title: true } }
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      });

      // 登頂記録
      const summitRecords = await prisma.summitRecord.findMany({
        where: { userId: studentId },
        include: {
          quest: { select: { title: true, difficulty: true } },
          badges: {
            include: { badge: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        success: true,
        data: {
          progress,
          learningEvents,
          summitRecords
        }
      });

    } catch (error) {
      console.error('Get student progress error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCodeHistory(req: Request, res: Response) {
    try {
      const teacherId = req.user?.userId;
      const studentId = req.params.id;

      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 認可チェック
      const isAuthorized = await prisma.classroomStudent.findFirst({
        where: {
          studentId,
          classroom: { teacherId }
        }
      });

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const codeHistory = await prisma.codeHistory.findMany({
        where: { userId: studentId },
        include: {
          project: { select: { name: true } },
          quest: { select: { title: true } }
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      return res.json({
        success: true,
        data: { codeHistory }
      });

    } catch (error) {
      console.error('Get code history error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async sendFeedback(req: Request, res: Response) {
    try {
      const teacherId = req.user?.userId;
      const studentId = req.params.id;
      const { message, questId } = req.body;

      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 認可チェック
      const isAuthorized = await prisma.classroomStudent.findFirst({
        where: {
          studentId,
          classroom: { teacherId }
        }
      });

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // フィードバックを学習イベントとして記録
      const feedbackEvent = await prisma.learningEvent.create({
        data: {
          userId: studentId,
          questId: questId,
          eventType: 'STEP_COMPLETE',
          data: {
            message,
            teacherId,
            timestamp: new Date()
          }
        }
      });

      // WebSocket通知（実装済みのSocketManagerを使用）
      req.app.get('socketManager')?.notifyUser(studentId, 'teacher_feedback', {
        message,
        questId,
        teacherName: req.user?.name
      });

      return res.json({
        success: true,
        data: { feedbackEvent }
      });

    } catch (error) {
      console.error('Send feedback error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createClassroom(req: Request, res: Response) {
    try {
      const teacherId = req.user?.userId;
      const { name, description } = req.body;

      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 招待コード生成
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const classroom = await prisma.classroom.create({
        data: {
          name,
          description,
          inviteCode,
          teacherId
        }
      });

      return res.status(201).json({
        success: true,
        data: { classroom }
      });

    } catch (error) {
      console.error('Create classroom error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getClassrooms(req: Request, res: Response) {
    try {
      const teacherId = req.user?.userId;

      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const classrooms = await prisma.classroom.findMany({
        where: { teacherId },
        include: {
          students: {
            include: {
              student: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          _count: {
            select: { students: true, assignments: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        success: true,
        data: { classrooms }
      });

    } catch (error) {
      console.error('Get classrooms error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async assignQuest(req: Request, res: Response) {
    try {
      const teacherId = req.user?.userId;
      const { classroomId, questId, title, description, dueDate } = req.body;

      if (!teacherId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // クラスの所有者確認
      const classroom = await prisma.classroom.findFirst({
        where: { id: classroomId, teacherId }
      });

      if (!classroom) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const assignment = await prisma.assignment.create({
        data: {
          classroomId,
          questId,
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : null
        }
      });

      // 全生徒に通知
      const students = await prisma.classroomStudent.findMany({
        where: { classroomId },
        select: { studentId: true }
      });

      students.forEach(student => {
        req.app.get('socketManager')?.notifyUser(student.studentId, 'assignment_created', {
          assignment,
          classroomName: classroom.name
        });
      });

      return res.status(201).json({
        success: true,
        data: { assignment }
      });

    } catch (error) {
      console.error('Assign quest error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}