import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { generateInviteCode } from '../utils/helpers';

const classroomSchema = z.object({
  name: z.string().min(1, 'クラスルーム名は必須です'),
  description: z.string().optional()
});

const assignmentSchema = z.object({
  questId: z.string().uuid('有効なクエストIDを入力してください'),
  title: z.string().min(1, '課題名は必須です'),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional()
});

export const createClassroom = async (req: Request, res: Response) => {
  try {
    const teacherId = req.user!.userId;
    const { name, description } = classroomSchema.parse(req.body);

    // Check if user is a teacher
    const user = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { role: true }
    });

    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '教師権限が必要です'
        }
      });
    }

    const inviteCode = generateInviteCode();

    const classroom = await prisma.classroom.create({
      data: {
        name,
        description,
        inviteCode,
        teacherId
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            students: true,
            assignments: true
          }
        }
      }
    });

    logger.info(`Classroom created: ${classroom.id} by teacher ${teacherId}`);

    return res.status(201).json({
      message: 'クラスルームが作成されました',
      classroom
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors
        }
      });
    }

    logger.error('Classroom creation error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クラスルームの作成中にエラーが発生しました'
      }
    });
  }
};

export const getClassrooms = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    let classrooms;

    if (user?.role === 'TEACHER' || user?.role === 'ADMIN') {
      // Teachers get classrooms they own
      classrooms = await prisma.classroom.findMany({
        where: { teacherId: userId },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              students: true,
              assignments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Students get classrooms they're enrolled in
      classrooms = await prisma.classroom.findMany({
        where: {
          students: {
            some: {
              studentId: userId,
              isActive: true
            }
          }
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              students: true,
              assignments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.json({ classrooms });
  } catch (error) {
    logger.error('Get classrooms error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クラスルーム一覧の取得中にエラーが発生しました'
      }
    });
  }
};

export const getClassroom = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check access permissions
    const classroom = await prisma.classroom.findFirst({
      where: {
        id,
        OR: [
          { teacherId: userId },
          {
            students: {
              some: {
                studentId: userId,
                isActive: true
              }
            }
          }
        ]
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        students: {
          where: { isActive: true },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        assignments: {
          include: {
            quest: {
              select: {
                id: true,
                title: true,
                difficulty: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!classroom) {
      return res.status(404).json({
        error: {
          code: 'CLASSROOM_NOT_FOUND',
          message: 'クラスルームが見つかりません'
        }
      });
    }

    return res.json({ classroom });
  } catch (error) {
    logger.error('Get classroom error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クラスルーム詳細の取得中にエラーが発生しました'
      }
    });
  }
};

export const joinClassroom = async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.userId;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({
        error: {
          code: 'INVITE_CODE_REQUIRED',
          message: '招待コードは必須です'
        }
      });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { inviteCode }
    });

    if (!classroom) {
      return res.status(404).json({
        error: {
          code: 'INVALID_INVITE_CODE',
          message: '招待コードが無効です'
        }
      });
    }

    // Check if already joined
    const existingMembership = await prisma.classroomStudent.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId
        }
      }
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return res.status(400).json({
          error: {
            code: 'ALREADY_JOINED',
            message: '既にこのクラスルームに参加しています'
          }
        });
      } else {
        // Reactivate membership
        await prisma.classroomStudent.update({
          where: {
            classroomId_studentId: {
              classroomId: classroom.id,
              studentId
            }
          },
          data: {
            isActive: true,
            joinedAt: new Date()
          }
        });
      }
    } else {
      // Create new membership
      await prisma.classroomStudent.create({
        data: {
          classroomId: classroom.id,
          studentId
        }
      });
    }

    logger.info(`Student ${studentId} joined classroom ${classroom.id}`);

    return res.json({
      message: 'クラスルームに参加しました',
      classroom: {
        id: classroom.id,
        name: classroom.name,
        description: classroom.description
      }
    });
  } catch (error) {
    logger.error('Join classroom error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クラスルーム参加中にエラーが発生しました'
      }
    });
  }
};

export const leaveClassroom = async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.userId;
    const { id } = req.params;

    const membership = await prisma.classroomStudent.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: id,
          studentId
        }
      }
    });

    if (!membership || !membership.isActive) {
      return res.status(404).json({
        error: {
          code: 'NOT_A_MEMBER',
          message: 'このクラスルームのメンバーではありません'
        }
      });
    }

    await prisma.classroomStudent.update({
      where: {
        classroomId_studentId: {
          classroomId: id,
          studentId
        }
      },
      data: { isActive: false }
    });

    logger.info(`Student ${studentId} left classroom ${id}`);

    return res.json({
      message: 'クラスルームから退出しました'
    });
  } catch (error) {
    logger.error('Leave classroom error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クラスルーム退出中にエラーが発生しました'
      }
    });
  }
};

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const teacherId = req.user!.userId;
    const { id } = req.params; // classroom id
    const { questId, title, description, dueDate } = assignmentSchema.parse(req.body);

    // Verify teacher owns the classroom
    const classroom = await prisma.classroom.findFirst({
      where: {
        id,
        teacherId
      }
    });

    if (!classroom) {
      return res.status(404).json({
        error: {
          code: 'CLASSROOM_NOT_FOUND',
          message: 'クラスルームが見つかりません'
        }
      });
    }

    // Verify quest exists and is owned by teacher
    const quest = await prisma.quest.findFirst({
      where: {
        id: questId,
        userId: teacherId
      }
    });

    if (!quest) {
      return res.status(404).json({
        error: {
          code: 'QUEST_NOT_FOUND',
          message: 'クエストが見つかりません'
        }
      });
    }

    const assignment = await prisma.assignment.create({
      data: {
        classroomId: id,
        questId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        quest: {
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true
          }
        }
      }
    });

    logger.info(`Assignment created: ${assignment.id} in classroom ${id}`);

    return res.status(201).json({
      message: '課題が作成されました',
      assignment
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors
        }
      });
    }

    logger.error('Assignment creation error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '課題の作成中にエラーが発生しました'
      }
    });
  }
};

