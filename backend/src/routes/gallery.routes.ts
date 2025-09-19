/**
 * Phase2以降に保留 - 今はやらない
 * 「絶景」実装ギャラリー機能のルート
 */

import { Router } from 'express';
import { GalleryController } from '../controllers/gallery.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const galleryController = new GalleryController();

// Public endpoints (no authentication required)
router.get('/article/:articleUrl', galleryController.getImplementationsByArticle.bind(galleryController));
router.get('/featured', galleryController.getFeaturedImplementations.bind(galleryController));
router.get('/search', galleryController.searchImplementations.bind(galleryController));
router.get('/implementation/:implementationId', galleryController.getImplementationDetails.bind(galleryController));

// Endpoints requiring authentication
router.use(authMiddleware);
router.post('/implementation/:implementationId/like', galleryController.likeImplementation.bind(galleryController));
router.post('/implementation/:implementationId/comment', galleryController.commentOnImplementation.bind(galleryController));

export { router as galleryRoutes };