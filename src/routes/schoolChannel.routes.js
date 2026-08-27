import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import schoolChannelController from '../controllers/schoolChannel.controller.js';

const router = express.Router();

// Admin secret middleware for admin routes
const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET || 'H5';
  if (secret && secret === expected) {
    // Admin secret is valid, skip JWT auth
    return next();
  }
  // If no admin secret, fall through to JWT auth
  return authenticate(req, res, next);
};

// Admin routes - accept either admin secret or JWT token
router.get('/admin/all', adminAuth, schoolChannelController.getAllChannels);
router.get('/admin/:id/members', adminAuth, schoolChannelController.getChannelMembersAdmin);
router.post('/admin/create', adminAuth, schoolChannelController.createChannel);
router.post('/admin/broadcast', adminAuth, schoolChannelController.broadcastMessage);
router.delete('/admin/:id', adminAuth, schoolChannelController.deleteChannel);

// Admin message monitoring routes
router.get('/admin/messages/all', adminAuth, schoolChannelController.getAllMessages);
router.delete('/admin/messages/:messageId', adminAuth, schoolChannelController.deleteMessageAdmin);

// All other routes require JWT authentication
router.use(authenticate);

// Get user's school channel
router.get('/', schoolChannelController.getUserChannel);

// Get channel messages
router.get('/messages', schoolChannelController.getMessages);

// Send message to channel
router.post('/messages', schoolChannelController.sendMessage);

// Get channel members
router.get('/members', schoolChannelController.getMembers);

// Delete a message
router.delete('/messages/:messageId', schoolChannelController.deleteMessage);

// Pin/Unpin a message
router.put('/messages/:messageId/pin', schoolChannelController.pinMessage);

// Add reaction to message
router.post('/messages/:messageId/react', schoolChannelController.addReaction);

export default router;
