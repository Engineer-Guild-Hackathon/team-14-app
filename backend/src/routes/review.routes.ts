import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const reviewController = new ReviewController();

router.use(authMiddleware);

// レビューリクエスト
router.post('/request', reviewController.requestReview.bind(reviewController));
router.get('/requests', reviewController.getReviewRequests.bind(reviewController));
router.delete('/request/:reviewRequestId', reviewController.cancelReviewRequest.bind(reviewController));

// レビュー実行
router.post('/submit/:reviewRequestId', reviewController.submitReview.bind(reviewController));
router.get('/my-reviews', reviewController.getMyReviews.bind(reviewController));
router.get('/:reviewId', reviewController.getReviewDetails.bind(reviewController));

export { router as reviewRoutes };