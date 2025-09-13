import { Router } from 'express';
import { AchievementController } from '../controllers/achievement.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const achievementController = new AchievementController();

router.use(authMiddleware);

// 登頂記録
router.post('/summit', achievementController.createSummitRecord.bind(achievementController));
router.get('/summit', achievementController.getSummitRecords.bind(achievementController));

// ポートフォリオ
router.get('/portfolio', achievementController.getPortfolio.bind(achievementController));
router.put('/portfolio', achievementController.updatePortfolio.bind(achievementController));

// 公開ポートフォリオ（認証不要）
router.get('/portfolio/public/:userId', achievementController.getPublicPortfolio.bind(achievementController));

// バッジ
router.get('/badges', achievementController.getBadges.bind(achievementController));

export { router as achievementRoutes };