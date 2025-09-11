import { Router } from 'express';
import { GalleryController } from '../controllers/gallery.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const galleryController = new GalleryController();

// 公開エンドポイント（認証不要）
router.get('/article/:articleUrl', galleryController.getImplementationsByArticle.bind(galleryController));
router.get('/featured', galleryController.getFeaturedImplementations.bind(galleryController));
router.get('/search', galleryController.searchImplementations.bind(galleryController));
router.get('/implementation/:implementationId', galleryController.getImplementationDetails.bind(galleryController));

// 認証が必要なエンドポイント
router.use(authMiddleware);
router.post('/implementation/:implementationId/like', galleryController.likeImplementation.bind(galleryController));
router.post('/implementation/:implementationId/comment', galleryController.commentOnImplementation.bind(galleryController));

export { router as galleryRoutes };