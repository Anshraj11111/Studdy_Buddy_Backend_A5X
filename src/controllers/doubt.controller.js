import doubtService from '../services/doubt.service.js';
import matchService from '../services/match.service.js';

/**
 * Create a new doubt
 * POST /api/doubts
 */
export const createDoubt = async (req, res) => {
  try {
    const { title, description, topic, tags } = req.body;

    // Input validation
    if (!title || !description || !topic) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide title, description, and topic',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Title cannot exceed 200 characters',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Description cannot exceed 5000 characters',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Create doubt
    const doubt = await doubtService.createDoubt({
      title,
      description,
      topic,
      tags: tags || [],
      userId: req.user._id,
    });

    // Try to find a matching doubt and create a room
    let room = null;
    try {
      room = await matchService.findAndMatch(doubt._id);
    } catch (matchError) {
      // Log matching error but don't fail the doubt creation
      console.error('Error during doubt matching:', matchError);
    }

    res.status(201).json({
      success: true,
      data: {
        doubt,
        room: room || null,
        matched: room !== null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create doubt',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get all doubts with pagination
 * GET /api/doubts
 */
export const getDoubts = async (req, res) => {
  try {
    const { page = 1, limit = 10, topic, status, userId } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    // Build filters
    const filters = {};
    if (topic) filters.topic = topic;
    if (status) filters.status = status;
    if (userId) filters.userId = userId;

    // Get doubts
    const doubts = await doubtService.getDoubts(filters, {
      page: pageNum,
      limit: limitNum,
    });

    // Get total count
    const total = await doubtService.getDoubtsCount(filters);

    res.status(200).json({
      success: true,
      data: {
        doubts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch doubts',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get doubt by ID
 * GET /api/doubts/:id
 */
export const getDoubtById = async (req, res) => {
  try {
    const { id } = req.params;

    const doubt = await doubtService.getDoubtById(id);

    res.status(200).json({
      success: true,
      data: {
        doubt,
      },
    });
  } catch (error) {
    if (error.message === 'Doubt not found') {
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
        message: 'Failed to fetch doubt',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Search doubts
 * GET /api/doubts/search
 */
export const searchDoubts = async (req, res) => {
  try {
    const { keyword, page = 1, limit = 10 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a search keyword',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const doubts = await doubtService.searchDoubts(keyword, {
      page: pageNum,
      limit: limitNum,
    });

    res.status(200).json({
      success: true,
      data: {
        doubts,
        pagination: {
          page: pageNum,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to search doubts',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get doubts by topic
 * GET /api/doubts/topic/:topic
 */
export const getDoubtsByTopic = async (req, res) => {
  try {
    const { topic } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const doubts = await doubtService.getDoubtsByTopic(topic, {
      page: pageNum,
      limit: limitNum,
    });

    const total = await doubtService.getDoubtsCount({ topic });

    res.status(200).json({
      success: true,
      data: {
        doubts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch doubts by topic',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Find match for a doubt manually
 * POST /api/doubts/:id/find-match
 */
export const findMatch = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the doubt
    const doubt = await doubtService.getDoubtById(id);

    // Check if user owns this doubt
    const doubtUserId = doubt.userId._id ? doubt.userId._id.toString() : doubt.userId.toString();
    const currentUserId = req.user._id.toString();
    
    if (doubtUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only find matches for your own doubts',
          code: 'FORBIDDEN',
        },
      });
    }

    // Check if doubt is already matched
    if (doubt.status === 'matched') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'This doubt is already matched',
          code: 'ALREADY_MATCHED',
        },
      });
    }

    // Try to find a matching doubt and create a room
    let room = null;
    try {
      room = await matchService.findAndMatch(id);
    } catch (matchError) {
      console.error('Error during doubt matching:', matchError);
    }

    res.status(200).json({
      success: true,
      data: {
        matched: room !== null,
        room: room || null,
      },
    });
  } catch (error) {
    if (error.message === 'Doubt not found') {
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
        message: 'Failed to find match',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Update doubt
 * PUT /api/doubts/:id
 */
export const updateDoubt = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, topic, tags } = req.body;

    // Get the doubt first to check ownership
    const doubt = await doubtService.getDoubtById(id);

    // Check if user owns this doubt - handle both populated and non-populated userId
    const doubtUserId = doubt.userId._id ? doubt.userId._id.toString() : doubt.userId.toString();
    const currentUserId = req.user._id.toString();
    
    if (doubtUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only update your own doubts',
          code: 'FORBIDDEN',
        },
      });
    }

    // Update the doubt
    const updatedDoubt = await doubtService.updateDoubt(id, {
      title,
      description,
      topic,
      tags,
    });

    res.status(200).json({
      success: true,
      data: {
        doubt: updatedDoubt,
      },
    });
  } catch (error) {
    if (error.message === 'Doubt not found') {
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
        message: 'Failed to update doubt',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete doubt
 * DELETE /api/doubts/:id
 */
export const deleteDoubt = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the doubt first to check ownership
    const doubt = await doubtService.getDoubtById(id);

    // Check if user owns this doubt - handle both populated and non-populated userId
    const doubtUserId = doubt.userId._id ? doubt.userId._id.toString() : doubt.userId.toString();
    const currentUserId = req.user._id.toString();
    
    if (doubtUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only delete your own doubts',
          code: 'FORBIDDEN',
        },
      });
    }

    // Delete the doubt
    await doubtService.deleteDoubt(id);

    res.status(200).json({
      success: true,
      data: {
        message: 'Doubt deleted successfully',
      },
    });
  } catch (error) {
    if (error.message === 'Doubt not found') {
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
        message: 'Failed to delete doubt',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Add reply to a doubt
 * POST /api/doubts/:id/replies
 */
export const addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Reply content is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const doubt = await doubtService.addReply(id, {
      user: req.user._id,
      content: content.trim(),
    });

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Doubt not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { doubt },
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to add reply',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Edit a reply
 * PUT /api/doubts/:id/replies/:replyId
 */
export const editReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Reply content is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const doubt = await doubtService.editReply(id, replyId, req.user._id, content.trim());

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Doubt or reply not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { doubt },
    });
  } catch (error) {
    console.error('Error editing reply:', error);
    if (error.message === 'Unauthorized') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only edit your own replies',
          code: 'FORBIDDEN',
        },
      });
    }
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to edit reply',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete a reply
 * DELETE /api/doubts/:id/replies/:replyId
 */
export const deleteReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;

    const doubt = await doubtService.deleteReply(id, replyId, req.user._id);

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Doubt or reply not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { doubt },
    });
  } catch (error) {
    console.error('Error deleting reply:', error);
    if (error.message === 'Unauthorized') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only delete your own replies',
          code: 'FORBIDDEN',
        },
      });
    }
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete reply',
        code: 'SERVER_ERROR',
      },
    });
  }
};


export default {
  createDoubt,
  getDoubts,
  getDoubtById,
  searchDoubts,
  getDoubtsByTopic,
  findMatch,
  updateDoubt,
  deleteDoubt,
  addReply,
  editReply,
  deleteReply,
};
