import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AchievementController {

  async createSummitRecord(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { 
        questId, 
        title, 
        description, 
        reflection, 
        codeSnapshot, 
        beforeCode,
        implementationTime,
        techStack,
        isPublic = false,
        isPortfolio = false
      } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // クエスト情報取得
      const quest = await prisma.quest.findFirst({
        where: { id: questId, userId }
      });

      if (!quest) {
        return res.status(404).json({ error: 'Quest not found' });
      }

      // 登頂記録作成
      const summitRecord = await prisma.summitRecord.create({
        data: {
          userId,
          questId,
          title: title || `${quest.title}の実装`,
          description,
          reflection,
          codeSnapshot,
          beforeCode,
          implementationTime,
          articleUrl: quest.articleUrl,
          techStack,
          isPublic,
          isPortfolio
        }
      });

      // バッジ判定・付与
      const badges = await this.evaluateAndAwardBadges(userId, summitRecord);

      // Phase2以降に保留 - 今はやらない
      // 実装ギャラリーに自動登録（公開の場合）
      // if (isPublic) {
      //   await this.createImplementationGalleryEntry(summitRecord, quest);
      // }

      // ポートフォリオに自動追加（ポートフォリオ対象の場合）
      if (isPortfolio) {
        await this.addToPortfolio(userId, summitRecord.id);
      }

      return res.status(201).json({
        success: true,
        data: {
          summitRecord,
          badges,
          message: '登頂記録を作成しました！'
        }
      });

    } catch (error) {
      console.error('Create summit record error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSummitRecords(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { limit = 20, offset = 0, isPublic } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const whereCondition: any = { userId };
      if (isPublic !== undefined) {
        whereCondition.isPublic = isPublic === 'true';
      }

      const summitRecords = await prisma.summitRecord.findMany({
        where: whereCondition,
        include: {
          quest: {
            select: { title: true, difficulty: true }
          },
          badges: {
            include: { badge: true }
          },
          implementation: {
            select: { id: true, likes: { select: { id: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(offset as string),
        take: parseInt(limit as string)
      });

      return res.json({
        success: true,
        data: { summitRecords }
      });

    } catch (error) {
      console.error('Get summit records error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPortfolio(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let portfolio = await prisma.portfolio.findUnique({
        where: { userId },
        include: {
          entries: {
            include: {
              summitRecord: {
                include: {
                  quest: { select: { title: true, difficulty: true } },
                  badges: { include: { badge: true } }
                }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      });

      // ポートフォリオが存在しない場合は作成
      if (!portfolio) {
        portfolio = await prisma.portfolio.create({
          data: {
            userId,
            title: `${req.user?.name || 'ユーザー'}のポートフォリオ`,
            description: '学習の軌跡と実装記録',
            isPublic: false
          },
          include: {
            entries: {
              include: {
                summitRecord: {
                  include: {
                    quest: { select: { title: true, difficulty: true } },
                    badges: { include: { badge: true } }
                  }
                }
              }
            }
          }
        });
      }

      return res.json({
        success: true,
        data: { portfolio }
      });

    } catch (error) {
      console.error('Get portfolio error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPublicPortfolio(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const portfolio = await prisma.portfolio.findFirst({
        where: { 
          userId,
          isPublic: true
        },
        include: {
          user: {
            select: { name: true, bio: true, avatar: true }
          },
          entries: {
            include: {
              summitRecord: {
                include: {
                  quest: { select: { title: true, difficulty: true } },
                  badges: { include: { badge: true } },
                  implementation: {
                    select: { 
                      id: true, 
                      likes: { select: { id: true } },
                      comments: { select: { id: true } }
                    }
                  }
                }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!portfolio) {
        return res.status(404).json({ error: 'Public portfolio not found' });
      }

      return res.json({
        success: true,
        data: { portfolio }
      });

    } catch (error) {
      console.error('Get public portfolio error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePortfolio(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { title, description, isPublic, entryOrder } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // ポートフォリオ基本情報の更新
      const portfolio = await prisma.portfolio.upsert({
        where: { userId },
        update: {
          ...(title && { title }),
          ...(description && { description }),
          ...(isPublic !== undefined && { isPublic })
        },
        create: {
          userId,
          title: title || 'マイポートフォリオ',
          description: description || '',
          isPublic: isPublic || false
        }
      });

      // エントリーの順序更新
      if (entryOrder && Array.isArray(entryOrder)) {
        await Promise.all(
          entryOrder.map((summitId: string, index: number) =>
            prisma.portfolioEntry.updateMany({
              where: { 
                portfolioId: portfolio.id,
                summitId
              },
              data: { order: index }
            })
          )
        );
      }

      return res.json({
        success: true,
        data: { portfolio }
      });

    } catch (error) {
      console.error('Update portfolio error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getBadges(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // ユーザーの獲得バッジ
      const userBadges = await prisma.badgeAward.findMany({
        where: { userId },
        include: {
          badge: true,
          summitRecord: {
            select: { title: true, createdAt: true }
          }
        },
        orderBy: { awardedAt: 'desc' }
      });

      // 全バッジ一覧（獲得状況含む）
      const allBadges = await prisma.badge.findMany({
        include: {
          awards: {
            where: { userId },
            select: { id: true, awardedAt: true }
          }
        }
      });

      const badgesWithStatus = allBadges.map(badge => ({
        ...badge,
        isAwarded: badge.awards.length > 0,
        awardedAt: badge.awards[0]?.awardedAt || null
      }));

      return res.json({
        success: true,
        data: {
          userBadges,
          allBadges: badgesWithStatus,
          stats: {
            totalBadges: allBadges.length,
            awardedBadges: userBadges.length,
            completionRate: (userBadges.length / allBadges.length) * 100
          }
        }
      });

    } catch (error) {
      console.error('Get badges error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 内部メソッド：バッジ判定・付与
  private async evaluateAndAwardBadges(userId: string, summitRecord: any) {
    const newBadges = [];

    // 基本的なバッジ条件をチェック
    const conditions = [
      {
        name: '初回登頂',
        condition: async () => {
          const count = await prisma.summitRecord.count({
            where: { userId }
          });
          return count === 1;
        }
      },
      {
        name: '高速実装',
        condition: () => summitRecord.implementationTime < 3600 // 1時間以内
      },
      {
        name: '技術チャレンジャー',
        condition: () => summitRecord.techStack.length >= 3
      }
    ];

    for (const { name, condition } of conditions) {
      if (await condition()) {
        const badge = await prisma.badge.findFirst({
          where: { name }
        });

        if (badge) {
          const existingAward = await prisma.badgeAward.findFirst({
            where: { userId, badgeId: badge.id }
          });

          if (!existingAward) {
            const award = await prisma.badgeAward.create({
              data: {
                userId,
                badgeId: badge.id,
                summitId: summitRecord.id
              },
              include: { badge: true }
            });
            newBadges.push(award);
          }
        }
      }
    }

    return newBadges;
  }

  // Phase2以降に保留 - 今はやらない
  // 内部メソッド：実装ギャラリーエントリー作成
  /* 
  private async createImplementationGalleryEntry(summitRecord: any, quest: any) {
    const articleHash = Buffer.from(quest.articleUrl).toString('base64');

    await prisma.implementation.create({
      data: {
        userId: summitRecord.userId,
        questId: summitRecord.questId,
        summitId: summitRecord.id,
        title: summitRecord.title,
        description: summitRecord.description || '',
        code: summitRecord.codeSnapshot,
        approach: summitRecord.reflection || '',
        techStack: summitRecord.techStack,
        difficulty: quest.difficulty === 'EASY' ? 1 : quest.difficulty === 'MEDIUM' ? 2 : 3,
        implementTime: summitRecord.implementationTime,
        articleUrl: quest.articleUrl,
        articleHash,
        isPublic: true
      }
    });
  }
  */

  // 内部メソッド：ポートフォリオに追加
  private async addToPortfolio(userId: string, summitId: string) {
    let portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: { entries: true }
    });

    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          userId,
          title: 'マイポートフォリオ',
          description: '学習記録とアチーブメント'
        },
        include: { entries: true }
      });
    }

    const nextOrder = portfolio.entries.length;

    await prisma.portfolioEntry.create({
      data: {
        portfolioId: portfolio.id,
        summitId,
        order: nextOrder
      }
    });
  }
}