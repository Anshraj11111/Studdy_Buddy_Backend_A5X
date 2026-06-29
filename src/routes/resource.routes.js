import express from 'express';
import resourceController from '../controllers/resource.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', resourceController.getResources);
router.get('/search', resourceController.searchResources);
router.get('/topic/:topic', resourceController.getResourcesByTopic);

// ── Secure video watch — token IS the auth, no JWT header needed ──────────
// Must be before /:id to avoid being shadowed
router.get('/watch/:token', resourceController.watchVideo);

router.get('/:id', resourceController.getResourceById);

// Protected routes
router.post('/', authMiddleware.authenticate, resourceController.createResource);
router.post('/:id/download', authMiddleware.authenticate, resourceController.downloadResource);
router.post('/:id/token', authMiddleware.authenticate, resourceController.getVideoToken);
router.delete('/:id', authMiddleware.authenticate, resourceController.deleteResource);

export default router;
