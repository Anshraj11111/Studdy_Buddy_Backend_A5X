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
  updateUpiSettings,
  // Course Management
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseModules,
  createModule,
  createModuleStandalone,
  updateModule,
  deleteModule,
  // Lecture Management
  createLecture,
  getLecture,
  updateLecture,
  deleteLecture,
  // Post Moderation
  getAllPosts,
  adminDeletePost,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Admin auth — checks x-admin-secret header against ADMIN_SECRET env var.
// Secret lives only in backend env, never in client JS bundle.
const adminAuth = (req, res, next) => {
  const secret   = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return res.status(500).json({ success: false, error: { message: 'ADMIN_SECRET not configured on server' } });
  }
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

// Course management routes
router.get('/courses', getAllCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);
router.get('/courses/:courseId/modules', getCourseModules);

// Module management routes
router.post('/courses/:courseId/modules', createModule);
router.post('/modules', createModuleStandalone);
router.put('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);

// Lecture management routes
router.post('/lectures', createLecture);
router.get('/lectures/:id', getLecture);
router.put('/lectures/:id', updateLecture);
router.delete('/lectures/:id', deleteLecture);

// Post moderation routes
router.get('/posts', getAllPosts);
router.delete('/posts/:id', adminDeletePost);

export default router;
