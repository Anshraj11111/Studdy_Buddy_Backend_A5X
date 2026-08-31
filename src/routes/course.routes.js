import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import {
  getAllCourses,
  getCourseById,
  getModuleLectures,
  enrollInCourse,
  markVideoCompleted,
  getMyCourses,
} from '../controllers/course.controller.js';

const router = express.Router();

// Public routes (with optional auth for enrollment status)
router.get('/', optionalAuth, getAllCourses);
router.get('/:id', optionalAuth, getCourseById);
router.get('/modules/:id/lectures', optionalAuth, getModuleLectures);

// Protected routes
router.post('/:id/enroll', authenticate, enrollInCourse);
router.post('/:courseId/videos/:videoId/complete', authenticate, markVideoCompleted);
router.get('/my/enrolled', authenticate, getMyCourses);

export default router;
