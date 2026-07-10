import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getMyStatus, joinChannel, requestJoin, leaveChannel,
  getMessages, deleteMessage,
  addCode, getCodes, deleteCode, updateCode,
  getPendingRequests, acceptRequest, rejectRequest,
  getChannelMembers, getAllEnrollments,
  // ── YouTube Live Stream functions ──
  getStreamStatus, updateStreamUrl, startStream, stopStream,
} from '../controllers/broadcast.controller.js';

const router = express.Router();

// ── Admin secret middleware ────────────────────────────────────────────────────
const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET || 'H5';
  if (!secret || secret !== expected)
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  next();
};

// ── Student / Mentor routes (JWT auth) ────────────────────────────────────────
router.get('/status',            authenticate, getMyStatus);
router.post('/join',             authenticate, joinChannel);
router.post('/request-join',     authenticate, requestJoin);
router.post('/leave',            authenticate, leaveChannel);
router.get('/messages',          authenticate, getMessages);
router.delete('/messages/:id',   authenticate, deleteMessage);
router.get('/members/:channel',  authenticate, getChannelMembers); // mentor only in controller

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/codes',              adminAuth, getCodes);
router.post('/admin/codes',             adminAuth, addCode);
router.put('/admin/codes',              adminAuth, updateCode);
router.delete('/admin/codes/:id',       adminAuth, deleteCode);
router.get('/admin/requests',           adminAuth, getPendingRequests);
router.put('/admin/requests/:id/accept',adminAuth, acceptRequest);
router.put('/admin/requests/:id/reject',adminAuth, rejectRequest);
router.get('/admin/enrollments',        adminAuth, getAllEnrollments);

// ── YouTube Live Stream routes (Admin + Students) ─────────────────────────────
router.get('/stream/:channel',          authenticate, getStreamStatus);      // Get current stream
router.put('/admin/stream/:channel',    adminAuth, updateStreamUrl);        // Update YouTube video ID
router.post('/admin/stream/:channel/start', adminAuth, startStream);        // Mark as live
router.post('/admin/stream/:channel/stop',  adminAuth, stopStream);         // Mark as ended

export default router;
