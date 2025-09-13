/**
 * Phase2以降に保留 - 今はやらない
 * 「絶景」実装ギャラリー機能
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class GalleryController {

  async getImplementationsByArticle(req: Request, res: Response) {
    try {
      const { articleUrl } = req.params;
      const { limit = 20, offset = 0, sort = 'recent' } = req.query;
      
      // 記事URLからハッシュを生成
      const articleHash = crypto.createHash('sha256').update(articleUrl).digest('hex').substring(0, 16);

      let orderBy: any = { createdAt: 'desc' }; // デフォルト：最新順

      if (sort === 'popular') {
        orderBy = { likes: { _count: 'desc' } };
      } else if (sort === 'difficulty') {
        orderBy = { difficulty: 'asc' };
      }

      const implementations = await prisma.implementation.findMany({
        where: {
          articleHash,
          isPublic: true
        },
        include: {
          user: {
            select: { 
              id: true, 
              name: true, 
              avatar: true,
              // 匿名設定の場合は名前を隠す
            }
          },
          quest: {
            select: { title: true, difficulty: true }
          },
          likes: {
            select: { userId: true }
          },
          comments: {
            select: { 
              id: true,
              content: true,
              user: { select: { name: true, avatar: true } },
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 3 // 最新3件のコメントのみ
          },
          _count: {
            select: { likes: true, comments: true }
          }
        },
        orderBy,
        skip: parseInt(offset as string),
        take: parseInt(limit as string)
      });

      // 匿名実装の場合はユーザー名を隠す
      const processedImplementations = implementations.map(impl => ({
        ...impl,
        user: impl.isAnonymous ? {
          id: 'anonymous',
          name: '匿名ユーザー',
          avatar: null
        } : impl.user,
        isLiked: req.user ? impl.likes.some(like => like.userId === req.user?.userId) : false
      }));

      return res.json({
        success: true,
        data: {
          implementations: processedImplementations,
          articleInfo: {
            url: articleUrl,
            hash: articleHash,
            totalImplementations: await prisma.implementation.count({
              where: { articleHash, isPublic: true }
            })
          }
        }
      });

    } catch (error) {
      console.error('Get implementations by article error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getFeaturedImplementations(req: Request, res: Response) {
    try {
      const { limit = 10, timeRange = '7d' } = req.query;

      // 時間範囲の計算
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const implementations = await prisma.implementation.findMany({
        where: {
          isPublic: true,
          createdAt: { gte: startDate }
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          },
          quest: {
            select: { title: true, difficulty: true }
          },
          likes: {
            select: { userId: true }
          },
          comments: {
            select: { id: true },
          },
          _count: {
            select: { likes: true, comments: true }
          }
        },
        orderBy: {
          likes: { _count: 'desc' }
        },
        take: parseInt(limit as string)
      });

      const processedImplementations = implementations.map(impl => ({
        ...impl,
        user: impl.isAnonymous ? {
          id: 'anonymous',
          name: '匿名ユーザー',
          avatar: null
        } : impl.user,
        isLiked: req.user ? impl.likes.some(like => like.userId === req.user?.userId) : false
      }));

      return res.json({
        success: true,
        data: { implementations: processedImplementations }
      });

    } catch (error) {
      console.error('Get featured implementations error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async likeImplementation(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { implementationId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 既存のいいねをチェック
      const existingLike = await prisma.implementationLike.findUnique({
        where: {
          userId_implementationId: {
            userId,
            implementationId
          }
        }
      });

      if (existingLike) {
        // いいねを取り消し
        await prisma.implementationLike.delete({
          where: { id: existingLike.id }
        });

        return res.json({
          success: true,
          data: { liked: false, message: 'いいねを取り消しました' }
        });
      } else {
        // 実装が存在するかチェック
        const implementation = await prisma.implementation.findUnique({
          where: { id: implementationId }
        });

        if (!implementation) {
          return res.status(404).json({ error: 'Implementation not found' });
        }

        // いいねを追加
        await prisma.implementationLike.create({
          data: {
            userId,
            implementationId
          }
        });

        return res.json({
          success: true,
          data: { liked: true, message: 'いいねしました！' }
        });
      }

    } catch (error) {
      console.error('Like implementation error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async commentOnImplementation(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { implementationId } = req.params;
      const { content } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      // 実装が存在するかチェック
      const implementation = await prisma.implementation.findUnique({
        where: { id: implementationId },
        include: {
          user: { select: { id: true, name: true } }
        }
      });

      if (!implementation) {
        return res.status(404).json({ error: 'Implementation not found' });
      }

      const comment = await prisma.implementationComment.create({
        data: {
          userId,
          implementationId,
          content: content.trim()
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          }
        }
      });

      // 実装者に通知（自分のコメントでない場合）
      if (implementation.userId !== userId) {
        req.app.get('socketManager')?.notifyUser(implementation.userId, 'implementation_comment', {
          implementationTitle: implementation.title,
          commenterName: req.user?.name,
          comment: content.trim()
        });
      }

      return res.status(201).json({
        success: true,
        data: { comment }
      });

    } catch (error) {
      console.error('Comment on implementation error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getImplementationDetails(req: Request, res: Response) {
    try {
      const { implementationId } = req.params;

      const implementation = await prisma.implementation.findUnique({
        where: { id: implementationId },
        include: {
          user: {
            select: { id: true, name: true, avatar: true, bio: true }
          },
          quest: {
            select: { title: true, difficulty: true, description: true }
          },
          summitRecord: {
            select: {
              reflection: true,
              implementationTime: true,
              createdAt: true,
              badges: {
                include: { badge: true }
              }
            }
          },
          likes: {
            include: {
              user: { select: { id: true, name: true, avatar: true } }
            }
          },
          comments: {
            include: {
              user: { select: { id: true, name: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        }
      });

      if (!implementation) {
        return res.status(404).json({ error: 'Implementation not found' });
      }

      if (!implementation.isPublic) {
        // プライベートな実装は作者のみアクセス可能
        if (!req.user || req.user.userId !== implementation.userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const processedImplementation = {
        ...implementation,
        user: implementation.isAnonymous ? {
          id: 'anonymous',
          name: '匿名ユーザー',
          avatar: null,
          bio: null
        } : implementation.user,
        isLiked: req.user ? implementation.likes.some(like => like.user.id === req.user?.userId) : false,
        canEdit: req.user?.userId === implementation.userId
      };

      return res.json({
        success: true,
        data: { implementation: processedImplementation }
      });

    } catch (error) {
      console.error('Get implementation details error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async searchImplementations(req: Request, res: Response) {
    try {
      const { 
        query, 
        techStack, 
        difficulty, 
        timeRange,
        limit = 20,
        offset = 0
      } = req.query;

      let where: any = {
        isPublic: true
      };

      // キーワード検索
      if (query) {
        where.OR = [
          { title: { contains: query as string, mode: 'insensitive' } },
          { description: { contains: query as string, mode: 'insensitive' } },
          { approach: { contains: query as string, mode: 'insensitive' } }
        ];
      }

      // 技術スタック検索
      if (techStack) {
        const techs = (techStack as string).split(',');
        where.techStack = {
          hasSome: techs
        };
      }

      // 難易度フィルター
      if (difficulty) {
        const difficultyMap: { [key: string]: number } = {
          'easy': 1,
          'medium': 2,
          'hard': 3
        };
        where.difficulty = difficultyMap[difficulty as string];
      }

      // 時間範囲フィルター
      if (timeRange) {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7;
        where.createdAt = {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        };
      }

      const implementations = await prisma.implementation.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          },
          quest: {
            select: { title: true, difficulty: true }
          },
          _count: {
            select: { likes: true, comments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(offset as string),
        take: parseInt(limit as string)
      });

      const processedImplementations = implementations.map(impl => ({
        ...impl,
        user: impl.isAnonymous ? {
          id: 'anonymous',
          name: '匿名ユーザー',
          avatar: null
        } : impl.user
      }));

      const totalCount = await prisma.implementation.count({ where });

      return res.json({
        success: true,
        data: {
          implementations: processedImplementations,
          pagination: {
            total: totalCount,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string)
          }
        }
      });

    } catch (error) {
      console.error('Search implementations error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}