import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth.routes';
import { questRoutes } from './routes/quest.routes';
import { projectRoutes } from './routes/project.routes';
import { classroomRoutes } from './routes/classroom.routes';
import { teacherRoutes } from './routes/teacher.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { achievementRoutes } from './routes/achievement.routes';
import { galleryRoutes } from './routes/gallery.routes';
import { reviewRoutes } from './routes/review.routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'chrome-extension://' + (process.env.CHROME_EXTENSION_ID || '*')
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-extension-id']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/reviews', reviewRoutes);

// 404 handler
app.use((req, res) => {
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'エンドポイントが見つかりません'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'サーバーエラーが発生しました'
    }
  });
});

export default app;