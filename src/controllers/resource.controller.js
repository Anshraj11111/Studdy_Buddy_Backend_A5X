import resourceService from '../services/resource.service.js';
import { addXP } from '../services/xp.service.js';
import { generateVideoToken, verifyVideoToken } from '../utils/videoToken.js';

// Helper — extract YouTube video ID from a stored URL
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Helper — strip fileUrl from resource before sending to client
function sanitizeResource(resource) {
  if (!resource) return resource;
  const obj = resource.toObject ? resource.toObject() : { ...resource };
  delete obj.fileUrl;  // Never expose raw URL
  return obj;
}

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

/**
 * Issue a short-lived signed token for watching a video resource.
 * Returns the YouTube video ID (not the full URL) to the frontend.
 * POST /api/resources/:id/token  (auth required)
 */
export const getVideoToken = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await resourceService.getResourceById(id);

    if (resource.fileType !== 'link') {
      return res.status(400).json({
        success: false,
        error: { message: 'Not a video resource', code: 'INVALID_TYPE' },
      });
    }

    const videoId = extractYouTubeId(resource.fileUrl);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid YouTube URL stored', code: 'INVALID_URL' },
      });
    }

    // Generate signed token
    const token = generateVideoToken(id, String(req.user._id));

    // Increment view count
    resourceService.incrementDownloadCount(id).catch(() => {});

    // Return the signed token AND the video ID
    // The frontend uses the video ID to build the embed URL directly
    // This avoids the iframe redirect issue while still protecting the full URL
    res.status(200).json({ success: true, data: { token, videoId } });
  } catch (error) {
    if (error.message === 'Resource not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message, code: 'NOT_FOUND' },
      });
    }
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate token', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Validate token and redirect iframe to YouTube embed.
 * GET /api/resources/watch/:token  (no auth header needed — token IS the auth)
 * The iframe src points here; browser follows the redirect to YouTube embed.
 * No credentials are exposed to the frontend JS.
 */
export const watchVideo = async (req, res) => {
  try {
    const { token } = req.params;
    const { resourceId } = verifyVideoToken(token);

    const resource = await resourceService.getResourceById(resourceId);
    const videoId = extractYouTubeId(resource.fileUrl);

    if (!videoId) {
      return res.status(400).send('Invalid video URL');
    }

    // Redirect the iframe to the YouTube nocookie embed
    // youtube-nocookie.com prevents YouTube from setting tracking cookies
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    res.redirect(302, embedUrl);
  } catch (error) {
    const isExpired = error.message === 'Token expired';
    const status = isExpired ? 410 : 403;
    // Return a small HTML page shown inside the iframe on error
    res.status(status).send(`
      <!DOCTYPE html>
      <html>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;
                     background:#0f0f0f;color:white;font-family:sans-serif;margin:0;flex-direction:column;gap:12px">
          <div style="font-size:2rem">⏰</div>
          <p style="margin:0;font-size:1rem">${isExpired ? 'Session expired. Please reload and try again.' : 'Access denied.'}</p>
        </body>
      </html>
    `);
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
  getVideoToken,
  watchVideo,
};
