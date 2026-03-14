import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import matchService from '../services/match.service.js';
import messageService from '../services/message.service.js';
import Room from '../models/Room.js';

const router = express.Router();

/**
 * Create or get a direct room between student and mentor
 * POST /api/rooms/direct
 */
router.post('/direct', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user._id;

    if (!otherUserId) {
      return res.status(400).json({ success: false, error: { message: 'otherUserId is required' } });
    }

    // Check if room already exists between these two users
    let room = await Room.findOne({
      $or: [
        { student1: userId, student2: otherUserId },
        { student1: otherUserId, student2: userId },
      ],
    }).populate('student1').populate('student2');

    if (!room) {
      // Create new direct room
      room = new Room({
        student1: userId,
        student2: otherUserId,
        topic: 'Direct Message',
        status: 'active',
      });
      await room.save();
      room = await room.populate(['student1', 'student2']);
    }

    res.status(200).json({ success: true, data: { room } });
  } catch (error) {
    console.error('Error creating direct room:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create room' } });
  }
});

/**
 * Get all rooms for the current user (works for both students and mentors)
 * GET /api/rooms
 */
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching rooms for user:', req.user._id);
    const rooms = await matchService.getRoomsByUser(req.user._id);
    console.log('Found rooms:', rooms.length);
    
    res.status(200).json({
      success: true,
      data: { rooms },
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch rooms', code: 'SERVER_ERROR', details: error.message },
    });
  }
});

/**
 * Get room by ID with messages
 * GET /api/rooms/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get room details
    const room = await matchService.getRoomById(id);
    
    // Check if user is part of this room
    const userId = req.user._id.toString();
    const student1Id = room.student1._id.toString();
    const student2Id = room.student2._id.toString();
    
    if (userId !== student1Id && userId !== student2Id) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not authorized to access this room', code: 'FORBIDDEN' },
      });
    }
    
    // Get messages for this room
    const messages = await messageService.getMessagesByRoom(id);
    
    res.status(200).json({
      success: true,
      data: {
        room,
        messages,
      },
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    
    if (error.message === 'Room not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch room',
        code: 'SERVER_ERROR',
      },
    });
  }
});

export default router;
