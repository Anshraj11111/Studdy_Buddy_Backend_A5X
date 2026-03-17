import resourceService from '../services/resource.service.js';
import { addXP } from '../services/xp.service.js';

/**
 * Create a new resource
 * POST /api/resources
 */
export const createResource = async (req, res) => {
  try {
    const { title, description, fileUrl, fileType, topic, tags, isPublic } = req.body;

    // Validate required fields
    if (!title || !description || !fileUrl || !topic) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide title, description, fileUrl, and topic',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Create resource
    const resource = await resourceService.createResource({
      title,
      description,
      fileUrl,
      fileType: fileType || 'other',
      topic,
      tags: tags || [],
      uploadedBy: req.user._id,
      isPublic: isPublic !== false,
    });

    // Award XP for uploading a resource
    addXP(req.user._id, 20);

    res.status(201).json({
      success: true,
      data: {
        resource,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to create resource',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Get all resources with pagination
 * GET /api/resources
 */
export const getResources = async (req, res) => {
  try {
    const { page = 1, limit = 10, topic, uploadedBy, tags } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    // Build filters
    const filters = {};
    if (topic) filters.topic = topic;
    if (uploadedBy) filters.uploadedBy = uploadedBy;
    if (tags) {
      filters.tags = Array.isArray(tags) ? tags : [tags];
    }

    // Get resources
    const resources = await resourceService.getResources(filters, {
      page: pageNum,
      limit: limitNum,
    });

    // Get total count
    const total = await resourceService.getResourceCount(filters);

    res.status(200).json({
      success: true,
      data: {
        resources,
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
        message: 'Failed to fetch resources',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get resource by ID
 * GET /api/resources/:id
 */
export const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await resourceService.getResourceById(id);

    res.status(200).json({
      success: true,
      data: {
        resource,
      },
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
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
        message: 'Failed to fetch resource',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Search resources
 * GET /api/resources/search
 */
export const searchResources = async (req, res) => {
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

    const resources = await resourceService.searchResources(keyword, {
      page: pageNum,
      limit: limitNum,
    });

    res.status(200).json({
      success: true,
      data: {
        resources,
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
        message: 'Failed to search resources',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get resources by topic
 * GET /api/resources/topic/:topic
 */
export const getResourcesByTopic = async (req, res) => {
  try {
    const { topic } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const resources = await resourceService.getResourcesByTopic(topic, {
      page: pageNum,
      limit: limitNum,
    });

    const total = await resourceService.getResourceCount({ topic });

    res.status(200).json({
      success: true,
      data: {
        resources,
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
        message: 'Failed to fetch resources by topic',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Download resource (increment download count)
 * POST /api/resources/:id/download
 */
export const downloadResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await resourceService.incrementDownloadCount(id);

    res.status(200).json({
      success: true,
      data: {
        resource,
        message: 'Download count incremented',
      },
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
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
        message: 'Failed to download resource',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete resource
 * DELETE /api/resources/:id
 */
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const resource = await resourceService.getResourceById(id);
    if (resource.uploadedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to delete this resource',
          code: 'FORBIDDEN',
        },
      });
    }

    await resourceService.deleteResource(id);

    res.status(200).json({
      success: true,
      data: {
        message: 'Resource deleted successfully',
      },
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
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
        message: 'Failed to delete resource',
        code: 'SERVER_ERROR',
      },
    });
  }
};

export default {
  createResource,
  getResources,
  getResourceById,
  searchResources,
  getResourcesByTopic,
  downloadResource,
  deleteResource,
};
