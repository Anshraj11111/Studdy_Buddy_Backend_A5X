import communityService from '../services/community.service.js';

/**
 * Create a new community
 * POST /api/communities
 */
export const createCommunity = async (req, res) => {
  try {
    const { name, description, topic } = req.body;

    if (!name || !description || !topic) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide name, description, and topic',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const community = await communityService.createCommunity({
      name,
      description,
      topic,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: {
        community,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to create community',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Get all communities
 * GET /api/communities
 */
export const getCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 10, topic } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const filters = {};
    if (topic) filters.topic = topic;

    const communities = await communityService.getCommunities(filters, {
      page: pageNum,
      limit: limitNum,
    });

    const total = await communityService.getCommunityCount(filters);

    res.status(200).json({
      success: true,
      data: {
        communities,
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
        message: 'Failed to fetch communities',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get community by ID
 * GET /api/communities/:id
 */
export const getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await communityService.getCommunityById(id);

    res.status(200).json({
      success: true,
      data: {
        community,
      },
    });
  } catch (error) {
    if (error.message === 'Community not found') {
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
        message: 'Failed to fetch community',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Join a community
 * POST /api/communities/:id/join
 */
export const joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await communityService.joinCommunity(id, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        community,
        message: 'Successfully joined community',
      },
    });
  } catch (error) {
    if (error.message === 'Community not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to join community',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Leave a community
 * POST /api/communities/:id/leave
 */
export const leaveCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await communityService.leaveCommunity(id, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        community,
        message: 'Successfully left community',
      },
    });
  } catch (error) {
    if (error.message === 'Community not found') {
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
        message: 'Failed to leave community',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Create a post in a community
 * POST /api/communities/:id/posts
 */
export const createPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide post content',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const post = await communityService.createPost(id, req.user._id, content);

    res.status(201).json({
      success: true,
      data: {
        post,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to create post',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Get posts for a community
 * GET /api/communities/:id/posts
 */
export const getPostsByCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const posts = await communityService.getPostsByCommunity(id, {
      page: pageNum,
      limit: limitNum,
    });

    const total = await communityService.getPostCount(id);

    res.status(200).json({
      success: true,
      data: {
        posts,
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
        message: 'Failed to fetch posts',
        code: 'SERVER_ERROR',
      },
    });
  }
};

export default {
  createCommunity,
  getCommunities,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  createPost,
  getPostsByCommunity,
};
