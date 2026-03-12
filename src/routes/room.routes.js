import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import matchService from '../services/match.service.js';
import messageService from '../services/message.service.js';

const router = express.Router();

/**
 * Get all rooms for the current user
 * GET /api/rooms
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const rooms = await matchService.getRoomsByUser(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        rooms,
      },
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch rooms',
        code: 'SERVER_ERROR',
      },
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
        error: {
          message: 'You are not authorized to access this room',
          code: 'FORBIDDEN',
        },
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
