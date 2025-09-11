import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject
} from '../controllers/project.controller';

const router = Router();

// All project routes require authentication
router.use(authMiddleware);

/**
 * @route POST /api/projects
 * @desc Create new project
 * @access Private
 */
router.post('/', createProject);

/**
 * @route GET /api/projects
 * @desc Get user's projects
 * @access Private
 */
router.get('/', getProjects);

/**
 * @route GET /api/projects/:id
 * @desc Get project details
 * @access Private
 */
router.get('/:id', getProject);

/**
 * @route PUT /api/projects/:id
 * @desc Update project
 * @access Private
 */
router.put('/:id', updateProject);

/**
 * @route DELETE /api/projects/:id
 * @desc Delete project
 * @access Private
 */
router.delete('/:id', deleteProject);

export const projectRoutes = router;