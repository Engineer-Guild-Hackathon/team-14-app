import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReviewController {

  async requestReview(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { implementationId, title, description } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 実装が存在し、ユーザーが所有者であることを確認
      const implementation = await prisma.implementation.findFirst({
        where: { 
          id: implementationId, 
          userId 
        }
      });

      if (!implementation) {
        return res.status(404).json({ error: 'Implementation not found or not authorized' });
      }

      // 既存のレビューリクエストをチェック
      const existingRequest = await prisma.reviewRequest.findUnique({
        where: { implementationId }
      });

      if (existingRequest) {
        return res.status(409).json({ error: 'Review request already exists for this implementation' });
      }

      const reviewRequest = await prisma.reviewRequest.create({
        data: {
          requesterId: userId,
          implementationId,
          description: description || 'コードレビューをお願いします'
        },
        include: {
          requester: {
            select: { id: true, name: true }
          },
          implementation: {
            select: { 
              title: true, 
              description: true, 
              techStack: true,
              difficulty: true 
            }
          }
        }
      });

      // レビュワーに通知（将来的にマッチングアルゴリズムを実装）
      this.notifyPotentialReviewers(reviewRequest);

      return res.status(201).json({
        success: true,
        data: { reviewRequest }
      });

    } catch (error) {
      console.error('Request review error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getReviewRequests(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { 
        status = 'PENDING', 
        techStack,
        difficulty,
        limit = 20,
        offset = 0
      } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let where: any = {
        status: status as string,
        requesterId: { not: userId } // 自分のリクエスト以外
      };

      // 技術スタックでフィルター
      if (techStack) {
        const techs = (techStack as string).split(',');
        where.implementation = {
          techStack: { hasSome: techs }
        };
      }

      // 難易度でフィルター
      if (difficulty) {
        const difficultyMap: { [key: string]: number } = {
          'easy': 1, 'medium': 2, 'hard': 3
        };
        where.implementation = {
          ...where.implementation,
          difficulty: difficultyMap[difficulty as string]
        };
      }

      const reviewRequests = await prisma.reviewRequest.findMany({
        where,
        include: {
          requester: {
            select: { id: true, name: true }
          },
          implementation: {
            select: {
              title: true,
              description: true,
              techStack: true,
              difficulty: true,
              code: true,
              approach: true
            }
          },
          reviews: {
            where: { reviewerId: userId },
            select: { id: true, rating: true }
          },
          _count: {
            select: { reviews: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(offset as string),
        take: parseInt(limit as string)
      });

      const processedRequests = reviewRequests.map(request => ({
        ...request,
        hasUserReviewed: request.reviews.length > 0,
        totalReviews: request._count.reviews
      }));

      return res.json({
        success: true,
        data: { reviewRequests: processedRequests }
      });

    } catch (error) {
      console.error('Get review requests error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async submitReview(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { reviewRequestId } = req.params;
      const { rating, content, codeComments } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Review content is required' });
      }

      // レビューリクエストが存在することを確認
      const reviewRequest = await prisma.reviewRequest.findUnique({
        where: { id: reviewRequestId },
        include: {
          requester: { select: { id: true, name: true } },
          implementation: { select: { title: true } }
        }
      });

      if (!reviewRequest) {
        return res.status(404).json({ error: 'Review request not found' });
      }

      // 自分のリクエストにはレビューできない
      if (reviewRequest.requesterId === userId) {
        return res.status(403).json({ error: 'Cannot review your own implementation' });
      }

      // 既存のレビューをチェック
      const existingReview = await prisma.review.findUnique({
        where: {
          reviewRequestId_reviewerId: {
            reviewRequestId,
            reviewerId: userId
          }
        }
      });

      if (existingReview) {
        return res.status(409).json({ error: 'You have already reviewed this implementation' });
      }

      const review = await prisma.review.create({
        data: {
          reviewRequestId,
          reviewerId: userId,
          rating,
          content: content.trim()
        },
        include: {
          reviewer: {
            select: { id: true, name: true }
          }
        }
      });

      // レビューリクエストのステータスを更新
      const reviewCount = await prisma.review.count({
        where: { reviewRequestId }
      });

      if (reviewCount >= 3) { // 3件以上のレビューでクローズ
        await prisma.reviewRequest.update({
          where: { id: reviewRequestId },
          data: { status: 'COMPLETED' }
        });
      } else {
        await prisma.reviewRequest.update({
          where: { id: reviewRequestId },
          data: { status: 'IN_REVIEW' }
        });
      }

      // リクエスト者に通知
      req.app.get('socketManager')?.notifyUser(reviewRequest.requesterId, 'review_received', {
        implementationTitle: reviewRequest.implementation.title,
        reviewerName: req.user?.name,
        rating
      });

      return res.status(201).json({
        success: true,
        data: { review }
      });

    } catch (error) {
      console.error('Submit review error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMyReviews(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { type = 'given', limit = 20, offset = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (type === 'given') {
        // 自分が行ったレビュー
        const reviews = await prisma.review.findMany({
          where: { reviewerId: userId },
          include: {
            reviewRequest: {
              include: {
                requester: {
                  select: { id: true, name: true }
                },
                implementation: {
                  select: { title: true, techStack: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: parseInt(offset as string),
          take: parseInt(limit as string)
        });

        return res.json({
          success: true,
          data: { reviews }
        });

      } else if (type === 'received') {
        // 自分が受けたレビュー
        const reviewRequests = await prisma.reviewRequest.findMany({
          where: { requesterId: userId },
          include: {
            implementation: {
              select: { title: true, techStack: true }
            },
            reviews: {
              include: {
                reviewer: {
                  select: { id: true, name: true }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: parseInt(offset as string),
          take: parseInt(limit as string)
        });

        return res.json({
          success: true,
          data: { reviewRequests }
        });
      } else {
        return res.status(400).json({ error: 'Invalid type parameter. Must be "given" or "received"' });
      }

    } catch (error) {
      console.error('Get my reviews error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getReviewDetails(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;
      const userId = req.user?.userId;

      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
          reviewer: {
            select: { id: true, name: true }
          },
          reviewRequest: {
            include: {
              requester: {
                select: { id: true, name: true }
              },
              implementation: {
                select: {
                  title: true,
                  description: true,
                  code: true,
                  approach: true,
                  techStack: true,
                  difficulty: true
                }
              }
            }
          }
        }
      });

      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }

      // アクセス権限チェック
      const canAccess = 
        userId === review.reviewerId || 
        userId === review.reviewRequest.requesterId ||
        review.isPublic;

      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.json({
        success: true,
        data: { review }
      });

    } catch (error) {
      console.error('Get review details error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async cancelReviewRequest(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { reviewRequestId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const reviewRequest = await prisma.reviewRequest.findFirst({
        where: { 
          id: reviewRequestId,
          requesterId: userId
        }
      });

      if (!reviewRequest) {
        return res.status(404).json({ error: 'Review request not found or not authorized' });
      }

      if (reviewRequest.status !== 'PENDING') {
        return res.status(400).json({ error: 'Cannot cancel review request that is already in progress' });
      }

      await prisma.reviewRequest.update({
        where: { id: reviewRequestId },
        data: { status: 'CANCELLED' }
      });

      return res.json({
        success: true,
        message: 'Review request cancelled successfully'
      });

    } catch (error) {
      console.error('Cancel review request error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 内部メソッド：潜在的レビュワーに通知
  private async notifyPotentialReviewers(reviewRequest: any) {
    try {
      // 同じ技術スタックを持つユーザーを検索
      const potentialReviewers = await prisma.implementation.findMany({
        where: {
          techStack: { hasSome: reviewRequest.implementation.techStack },
          userId: { not: reviewRequest.requesterId }
        },
        select: { userId: true },
        distinct: ['userId'],
        take: 10
      });

      // WebSocket通知
      const socketManager = require('../websocket/socketManager');
      potentialReviewers.forEach(reviewer => {
        socketManager.notifyUser?.(reviewer.userId, 'review_request_available', {
          requestId: reviewRequest.id,
          title: reviewRequest.title,
          techStack: reviewRequest.implementation.techStack
        });
      });

    } catch (error) {
      console.error('Notify potential reviewers error:', error);
    }
  }
}