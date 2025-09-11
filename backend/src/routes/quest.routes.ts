import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  generateQuestFromArticle,
  getQuests,
  getQuest,
  updateQuestProgress,
  verifyCode
} from '../controllers/quest.controller';

const router = Router();

// All quest routes require authentication
router.use(authMiddleware);

/**
 * @route POST /api/quests/generate
 * @desc Generate quest from article URL
 * @access Private
 */
router.post('/generate', generateQuestFromArticle);

/**
 * @route GET /api/quests
 * @desc Get user's quests
 * @access Private
 */
router.get('/', getQuests);

/**
 * @route GET /api/quests/:id
 * @desc Get quest details with steps
 * @access Private
 */
router.get('/:id', getQuest);

/**
 * @route PUT /api/quests/:id/progress
 * @desc Update quest progress
 * @access Private
 */
router.put('/:id/progress', updateQuestProgress);

/**
 * @route POST /api/quests/:questId/verify
 * @desc Verify code submission for a quest step
 * @access Private
 */
router.post('/:questId/verify', verifyCode);

export const questRoutes = router;