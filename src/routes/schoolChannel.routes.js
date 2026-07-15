import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import schoolChannelController from '../controllers/schoolChannel.controller.js';

const router = express.Router();

// All routes require authentication
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

// Admin routes - must be admin/mentor
router.get('/admin/all', schoolChannelController.getAllChannels);
router.post('/admin/create', schoolChannelController.createChannel);
router.delete('/admin/:id', schoolChannelController.deleteChannel);

export default router;
