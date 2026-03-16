import express from 'express';
import { getStats, getUsers, toggleUserActive, deleteUser } from '../controllers/admin.controller.js';

const router = express.Router();

// Admin secret middleware  checks x-admin-secret header
const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET || 'admin123';
  if (!secret || secret !== expected) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }
  next();
};

router.use(adminAuth);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/toggle', toggleUserActive);
router.delete('/users/:id', deleteUser);

export default router;
