import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

router.use(authMiddleware);

// 学習分析
router.get('/progress', analyticsController.getProgressAnalytics.bind(analyticsController));
router.get('/code-history', analyticsController.getCodeHistory.bind(analyticsController));
router.get('/learning-pattern', analyticsController.getLearningPattern.bind(analyticsController));

// クラス分析（教師用）
router.get('/classroom/:classroomId', analyticsController.getClassroomAnalytics.bind(analyticsController));

export { router as analyticsRoutes };