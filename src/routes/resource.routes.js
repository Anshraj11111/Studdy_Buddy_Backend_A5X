import express from 'express';
import resourceController from '../controllers/resource.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', resourceController.getResources);
router.get('/search', resourceController.searchResources);
router.get('/topic/:topic', resourceController.getResourcesByTopic);
router.get('/:id', resourceController.getResourceById);

// Protected routes
router.post('/', authMiddleware.authenticate, resourceController.createResource);
router.post('/:id/download', authMiddleware.authenticate, resourceController.downloadResource);
router.delete('/:id', authMiddleware.authenticate, resourceController.deleteResource);

export default router;
