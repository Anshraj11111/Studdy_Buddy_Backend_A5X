import express from 'express';
import { 
  getStats, 
  getUsers, 
  toggleUserActive, 
  deleteUser,
  preRegisterStudent,
  getPreRegisteredStudents,
  deletePreRegisteredStudent,
  updatePreRegisteredStudent
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Admin secret middleware  checks x-admin-secret header
const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET || 'H5';
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

// Pre-registration routes
router.post('/pre-register', authenticate, preRegisterStudent);
router.get('/pre-registered', getPreRegisteredStudents);
router.put('/pre-registered/:id', authenticate, updatePreRegisteredStudent);
router.delete('/pre-registered/:id', deletePreRegisteredStudent);

export default router;
