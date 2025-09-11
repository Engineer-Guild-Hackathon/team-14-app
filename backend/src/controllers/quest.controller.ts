import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { generateQuest } from '../services/quest.service';
import { verifyCode as verifyCodeService } from '../services/verification.service';

const questGenerationSchema = z.object({
  articleUrl: z.string().url('有効なURLを入力してください'),
  projectId: z.string().uuid('有効なプロジェクトIDを入力してください'),
  implementationGoal: z.string().min(1, '実装目標は必須です'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('MEDIUM')
});

const questUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED']).optional()
});

export const generateQuestFromArticle = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { articleUrl, projectId, implementationGoal, difficulty } = 
      questGenerationSchema.parse(req.body);

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId
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

    logger.info(`Generating quest for article: ${articleUrl}`);
    
    const questData = await generateQuest({
      articleUrl,
      implementationGoal,
      difficulty,
      projectContext: {
        name: project.name,
        description: project.description || ''
      }
    });

    const quest = await prisma.quest.create({
      data: {
        title: questData.title,
        description: questData.description,
        articleUrl,
        difficulty,
        userId,
        projectId,
        steps: {
          create: questData.steps.map((step, index) => ({
            stepNumber: index + 1,
            title: step.title,
            description: step.description,
            type: step.type,
            expectedCode: step.expectedCode || undefined,
            hints: step.hints
          }))
        }
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        },
        project: {
          select: {
            name: true,
            description: true
          }
        }
      }
    });

    await prisma.progress.create({
      data: {
        userId,
        questId: quest.id,
        status: 'PENDING',
        totalSteps: questData.steps.length,
        stepProgress: {
          create: quest.steps.map(step => ({
            stepId: step.id
          }))
        }
      }
    });

    logger.info(`Quest generated successfully: ${quest.id}`);

    return res.status(201).json({
      message: 'クエストが生成されました',
      quest
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

    logger.error('Quest generation error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クエスト生成中にエラーが発生しました'
      }
    });
  }
};

export const getQuests = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status, projectId } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const quests = await prisma.quest.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        progress: {
          where: { userId },
          select: {
            status: true,
            completedSteps: true,
            totalSteps: true,
            timeSpent: true,
            hintsUsed: true,
            startedAt: true,
            completedAt: true
          }
        },
        _count: {
          select: {
            steps: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      quests: quests.map(quest => ({
        ...quest,
        progress: quest.progress[0] || null
      }))
    });
  } catch (error) {
    logger.error('Get quests error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クエスト一覧の取得中にエラーが発生しました'
      }
    });
  }
};

export const getQuest = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const quest = await prisma.quest.findFirst({
      where: {
        id,
        userId
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            stepProgress: {
              where: {
                progress: {
                  userId
                }
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        progress: {
          where: { userId }
        }
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

    return res.json({
      quest: {
        ...quest,
        progress: quest.progress[0] || null
      }
    });
  } catch (error) {
    logger.error('Get quest error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クエスト詳細の取得中にエラーが発生しました'
      }
    });
  }
};

export const updateQuestProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { status } = questUpdateSchema.parse(req.body);

    const quest = await prisma.quest.findFirst({
      where: {
        id,
        userId
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

    // Get current progress
    const currentProgress = await prisma.progress.findUnique({
      where: {
        userId_questId: { userId, questId: id }
      }
    });

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'IN_PROGRESS' && !currentProgress?.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    const updatedProgress = await prisma.progress.update({
      where: {
        userId_questId: {
          userId,
          questId: id
        }
      },
      data: updateData
    });

    logger.info(`Quest progress updated: ${id} -> ${status}`);

    return res.json({
      message: 'クエストの進捗が更新されました',
      progress: updatedProgress
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

    logger.error('Update quest progress error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'クエストの進捗更新中にエラーが発生しました'
      }
    });
  }
};

export const verifyCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questId } = req.params;
    const { stepId, code, filePath } = req.body;

    const quest = await prisma.quest.findFirst({
      where: {
        id: questId,
        userId
      },
      include: {
        steps: {
          where: { id: stepId }
        }
      }
    });

    if (!quest || quest.steps.length === 0) {
      return res.status(404).json({
        error: {
          code: 'QUEST_OR_STEP_NOT_FOUND',
          message: 'クエストまたはステップが見つかりません'
        }
      });
    }

    const step = quest.steps[0];
    
    logger.info(`Code verification requested for step: ${stepId}`);

    // Use the advanced verification service
    const verificationResult = await verifyCodeService({
      stepId,
      filePath: filePath || 'code.txt',
      submittedCode: code,
      expectedCode: step.expectedCode || undefined,
      stepType: step.type
    });

    // Update step progress if verification is successful
    if (verificationResult.success) {
      await prisma.stepProgress.update({
        where: {
          progressId_stepId: {
            progressId: (await prisma.progress.findUnique({
              where: { userId_questId: { userId, questId } }
            }))!.id,
            stepId
          }
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          attempts: { increment: 1 }
        }
      });

      const completedSteps = await prisma.stepProgress.count({
        where: {
          progress: {
            userId,
            questId
          },
          isCompleted: true
        }
      });

      await prisma.progress.update({
        where: {
          userId_questId: { userId, questId }
        },
        data: {
          completedSteps,
          status: completedSteps === (await prisma.questStep.count({ where: { questId } })) ? 'COMPLETED' : 'IN_PROGRESS'
        }
      });
    } else {
      // Increment attempts even on failure
      await prisma.stepProgress.update({
        where: {
          progressId_stepId: {
            progressId: (await prisma.progress.findUnique({
              where: { userId_questId: { userId, questId } }
            }))!.id,
            stepId
          }
        },
        data: {
          attempts: { increment: 1 }
        }
      });
    }

    return res.json({
      success: verificationResult.success,
      score: verificationResult.score,
      message: verificationResult.feedback,
      hints: verificationResult.hints.length > 0 ? verificationResult.hints : step.hints,
      improvements: verificationResult.improvements,
      errors: verificationResult.errors
    });

  } catch (error) {
    logger.error('Code verification error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'コード検証中にエラーが発生しました'
      }
    });
  }
};