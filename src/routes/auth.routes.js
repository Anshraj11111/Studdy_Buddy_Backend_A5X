import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { passwordResetLimiter, passwordResetVerifyLimiter, authLimiter } from '../middleware/rate-limit.middleware.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetVerifyLimiter, authController.resetPassword);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

export default router;
