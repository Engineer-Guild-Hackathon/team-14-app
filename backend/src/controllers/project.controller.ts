import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const projectSchema = z.object({
  name: z.string().min(1, 'プロジェクト名は必須です'),
  description: z.string().optional(),
  localPath: z.string().min(1, 'ローカルパスは必須です'),
  gitUrl: z.string().url().optional()
});

const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  localPath: z.string().min(1).optional(),
  gitUrl: z.string().url().optional()
});

export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectData = projectSchema.parse(req.body);

    // Check if project with same local path exists
    const existingProject = await prisma.project.findFirst({
      where: {
        localPath: projectData.localPath,
        userId
      }
    });

    if (existingProject) {
      return res.status(400).json({
        error: {
          code: 'PROJECT_EXISTS',
          message: 'このパスのプロジェクトは既に存在します'
        }
      });
    }

    const project = await prisma.project.create({
      data: {
        ...projectData,
        userId
      },
      include: {
        _count: {
          select: {
            quests: true
          }
        }
      }
    });

    logger.info(`Project created: ${project.id} by user ${userId}`);

    return res.status(201).json({
      message: 'プロジェクトが作成されました',
      project
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

    logger.error('Project creation error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'プロジェクトの作成中にエラーが発生しました'
      }
    });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            quests: true
          }
        },
        quests: {
          select: {
            id: true,
            status: true,
            progress: {
              where: { userId },
              select: {
                status: true,
                completedSteps: true,
                totalSteps: true
              }
            }
          },
          take: 5,
          orderBy: { updatedAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Calculate project statistics
    const projectsWithStats = projects.map(project => ({
      ...project,
      stats: {
        totalQuests: project._count.quests,
        completedQuests: project.quests.filter(quest => 
          quest.progress[0]?.status === 'COMPLETED'
        ).length,
        inProgressQuests: project.quests.filter(quest => 
          quest.progress[0]?.status === 'IN_PROGRESS'
        ).length
      }
    }));

    return res.json({
      projects: projectsWithStats
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'プロジェクト一覧の取得中にエラーが発生しました'
      }
    });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId
      },
      include: {
        _count: {
          select: {
            quests: true
          }
        },
        quests: {
          include: {
            progress: {
              where: { userId },
              select: {
                status: true,
                completedSteps: true,
                totalSteps: true,
                timeSpent: true,
                startedAt: true,
                completedAt: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });
    }

    return res.json({ project });
  } catch (error) {
    logger.error('Get project error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'プロジェクト詳細の取得中にエラーが発生しました'
      }
    });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const updateData = projectUpdateSchema.parse(req.body);

    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });
    }

    // Check for path conflicts if localPath is being updated
    if (updateData.localPath && updateData.localPath !== existingProject.localPath) {
      const pathConflict = await prisma.project.findFirst({
        where: {
          localPath: updateData.localPath,
          userId,
          id: { not: id }
        }
      });

      if (pathConflict) {
        return res.status(400).json({
          error: {
            code: 'PATH_CONFLICT',
            message: 'このパスは既に他のプロジェクトで使用されています'
          }
        });
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            quests: true
          }
        }
      }
    });

    logger.info(`Project updated: ${id} by user ${userId}`);

    return res.json({
      message: 'プロジェクトが更新されました',
      project: updatedProject
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

    logger.error('Project update error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'プロジェクトの更新中にエラーが発生しました'
      }
    });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });
    }

    // Check if project has active quests
    const activeQuests = await prisma.quest.count({
      where: {
        projectId: id,
        status: 'IN_PROGRESS'
      }
    });

    if (activeQuests > 0) {
      return res.status(400).json({
        error: {
          code: 'PROJECT_HAS_ACTIVE_QUESTS',
          message: '進行中のクエストがあるプロジェクトは削除できません'
        }
      });
    }

    await prisma.project.delete({
      where: { id }
    });

    logger.info(`Project deleted: ${id} by user ${userId}`);

    return res.json({
      message: 'プロジェクトが削除されました'
    });
  } catch (error) {
    logger.error('Project deletion error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'プロジェクトの削除中にエラーが発生しました'
      }
    });
  }
};