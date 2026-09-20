/**
 * Course Access Routes - Admin panel
 */

import express from 'express';
import { getCourseAccessStats, getCourseAccessList } from '../controllers/courseAccess.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get course access stats
router.get('/stats', getCourseAccessStats);

// Get filtered list
router.get('/list', getCourseAccessList);

export default router;
