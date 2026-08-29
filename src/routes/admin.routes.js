import express from 'express';
import { 
  getStats, 
  getUsers, 
  toggleUserActive, 
  deleteUser,
  preRegisterStudent,
  getPreRegisteredStudents,
  deletePreRegisteredStudent,
  updatePreRegisteredStudent,
  getSchoolCodes,
  getAllPayments,
  approvePayment,
  rejectPayment,
  getUpiSettings,
  updateUpiSettings
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
router.post('/pre-register', preRegisterStudent);
router.get('/pre-registered', getPreRegisteredStudents);
router.get('/school-codes', getSchoolCodes);
router.put('/pre-registered/:id', updatePreRegisteredStudent);
router.delete('/pre-registered/:id', deletePreRegisteredStudent);

// Payment management routes
router.get('/payments', getAllPayments);
router.put('/payments/:id/approve', approvePayment);
router.put('/payments/:id/reject', rejectPayment);

// UPI settings routes
router.get('/upi-settings', getUpiSettings);
router.put('/upi-settings', updateUpiSettings);

export default router;
