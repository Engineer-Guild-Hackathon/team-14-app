import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createClassroom,
  getClassrooms,
  getClassroom,
  joinClassroom,
  leaveClassroom,
  createAssignment
} from '../controllers/classroom.controller';

const router = Router();

// All classroom routes require authentication
router.use(authMiddleware);

/**
 * @route POST /api/classrooms
 * @desc Create new classroom (teachers only)
 * @access Private
 */
router.post('/', createClassroom);

/**
 * @route GET /api/classrooms
 * @desc Get user's classrooms (as teacher or student)
 * @access Private
 */
router.get('/', getClassrooms);

/**
 * @route GET /api/classrooms/:id
 * @desc Get classroom details
 * @access Private
 */
router.get('/:id', getClassroom);

/**
 * @route POST /api/classrooms/join
 * @desc Join classroom with invite code
 * @access Private
 */
router.post('/join', joinClassroom);

/**
 * @route POST /api/classrooms/:id/leave
 * @desc Leave classroom
 * @access Private
 */
router.post('/:id/leave', leaveClassroom);

/**
 * @route POST /api/classrooms/:id/assignments
 * @desc Create assignment in classroom (teachers only)
 * @access Private
 */
router.post('/:id/assignments', createAssignment);

export const classroomRoutes = router;