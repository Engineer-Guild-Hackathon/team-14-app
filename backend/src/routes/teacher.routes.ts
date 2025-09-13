import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const teacherController = new TeacherController();

// 教師・メンター専用ルート
router.use(authMiddleware);

// ダッシュボード
router.get('/dashboard', teacherController.getDashboard.bind(teacherController));

// 生徒管理
router.get('/students/:id/progress', teacherController.getStudentProgress.bind(teacherController));
router.get('/students/:id/code-history', teacherController.getCodeHistory.bind(teacherController));
router.post('/students/:id/feedback', teacherController.sendFeedback.bind(teacherController));

// クラス管理
router.get('/classrooms', teacherController.getClassrooms.bind(teacherController));
router.post('/classrooms', teacherController.createClassroom.bind(teacherController));
router.post('/assignments', teacherController.assignQuest.bind(teacherController));

export { router as teacherRoutes };