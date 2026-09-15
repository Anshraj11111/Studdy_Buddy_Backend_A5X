import express from 'express';
import FeedPost from '../models/FeedPost.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { addXP } from '../services/xp.service.js';
import { checkContent } from '../utils/contentFilter.js';
import { escapeRegex } from '../utils/sanitize.js';
import { sendPushToUser } from '../services/webPush.service.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// Helper: emit socket notification to a user
const emitNotification = (io, userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

// GET /api/feed/liked - Get posts liked by current user
router.get('/liked', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user._id;

    // Find posts where user's ID is in the likes array
    const posts = await FeedPost.find({
      likes: userId
    })
      .populate('userId', 'name profileImage role skills')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FeedPost.countDocuments({ likes: userId });

    res.json({
      success: true,
      data: {
        posts,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
    });
  } catch (err) {
    console.error('Failed to fetch liked posts:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch liked posts' } });
  }
});

// GET /api/feed?category=Robotics&page=1&limit=20
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, page = 1, limit = 20, search = '', userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Cache key — TTL 2 min (feed changes frequently)
    const cacheKey = `feed:${category || 'All'}:${page}:${limit}:${search.trim()}:${userId || ''}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const query = {};
    if (category && category !== 'All') query.category = category;
    if (search.trim()) {
      query.content = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }
    // Filter by specific user if userId provided
    if (userId) {
      query.userId = userId;
    }

    // Fetch more posts than needed for randomization
    const fetchLimit = parseInt(limit) * 3; // Fetch 3x more posts
    const allPosts = await FeedPost.find(query)
      .populate('userId', 'name profileImage role skills')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    // Separate recent (last 7 days) and older posts
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPosts = allPosts.filter(post => post.createdAt >= sevenDaysAgo);
    const olderPosts = allPosts.filter(post => post.createdAt < sevenDaysAgo);

    // Shuffle recent posts for randomness
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Mix: 70% recent shuffled + 30% older (chronological)
    const shuffledRecent = shuffleArray(recentPosts);
    const mixedPosts = [...shuffledRecent, ...olderPosts];

    // Apply pagination on mixed results
    const posts = mixedPosts.slice(skip, skip + parseInt(limit));

    const total = await FeedPost.countDocuments(query);

    const response = {
      success: true,
      data: {
        posts,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
    };

    // Only cache non-search requests (search results less likely to be reused)
    // Disable cache for randomized feed to ensure fresh shuffle on each request
    // if (!search.trim()) {
    //   await setCache(cacheKey, response, 120); // 2 min TTL
    // }

    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch feed' } });
  }
});

// POST /api/feed
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, category = 'All', mediaUrl, mediaType } = req.body;
    if (!content?.trim() && !mediaUrl) {
      return res.status(400).json({ success: false, error: { message: 'Content or media is required' } });
    }

    // Content moderation - block abusive words in post content
    if (content?.trim()) {
      const modResult = checkContent(content);
      if (modResult.blocked) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            message: modResult.reason,
            code: 'CONTENT_BLOCKED'
          } 
        });
      }
    }

    const post = await FeedPost.create({
      userId: req.user._id,
      content: content?.trim() || '',
      category,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
    });

    const populated = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role skills');

    // Award XP for creating a feed post
    await addXP(req.user._id, 'post');

    // Invalidate feed cache so new post shows immediately
    deleteCache('feed:*').catch(() => {});

    res.status(201).json({ success: true, data: { post: populated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to create post' } });
  }
});

// DELETE /api/feed/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });
    if (String(post.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    await post.deleteOne();
    
    // 🔥 IMPORTANT: Invalidate feed cache after post deleted
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });
    console.log('✅ Feed cache invalidated after post deleted');
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to delete post' } });
  }
});

// PUT /api/feed/:id - Edit post
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { content, category, mediaUrl, mediaType } = req.body;
    
    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });
    if (String(post.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to edit this post' } });
    }

    // Content moderation - block abusive words
    if (content?.trim()) {
      const modResult = checkContent(content);
      if (modResult.blocked) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            message: modResult.reason,
            code: 'CONTENT_BLOCKED'
          } 
        });
      }
    }

    // Update fields
    if (content !== undefined) post.content = content.trim();
    if (category !== undefined) post.category = category;
    if (mediaUrl !== undefined) post.mediaUrl = mediaUrl;
    if (mediaType !== undefined) post.mediaType = mediaType;

    await post.save();

    const populated = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role skills')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    // Invalidate cache
    deleteCache('feed:*').catch(() => {});

    res.json({ success: true, data: { post: populated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to update post' } });
  }
});

// POST /api/feed/:id/like  (toggle)
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const uid = String(req.user._id);
    const liked = post.likes.map(String).includes(uid);

    if (liked) {
      post.likes = post.likes.filter(id => String(id) !== uid);
    } else {
      post.likes.push(req.user._id);

      // Award XP to post owner for receiving a like
      if (String(post.userId) !== uid) {
        await addXP(String(post.userId), 'like_received');

        // Notify post owner (not self)
        const notif = await Notification.create({
          recipient: post.userId,
          sender: req.user._id,
          type: 'like',
          postId: post._id,
          message: `${req.user.name} liked your post`,
        });
        const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
        const io = req.app.get('io');
        emitNotification(io, String(post.userId), populated);
        // Push to device even if app/browser is closed
        sendPushToUser(String(post.userId), {
          title: 'Studdy Buddy',
          body: `${req.user.name} liked your post`,
          icon: req.user.profileImage || '/icons/icon-192x192.png',
          url: '/feed',
          type: 'like',
        });
      }
    }
    await post.save();

    // 🔥 IMPORTANT: Invalidate ALL feed cache when a like is added/removed
    // This ensures that when user refreshes page, they get updated like counts
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });
    console.log('✅ Feed cache invalidated after like toggle');

    res.json({ success: true, data: { liked: !liked, likeCount: post.likes.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to toggle like' } });
  }
});

// POST /api/feed/:id/comment
router.post('/:id/comment', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Comment cannot be empty' } });
    }

    // Content moderation - block abusive words
    const modResult = checkContent(content);
    if (modResult.blocked) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          message: modResult.reason,
          code: 'CONTENT_BLOCKED'
        } 
      });
    }

    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    post.comments.push({ userId: req.user._id, content: content.trim() });
    await post.save();

    // 🔥 IMPORTANT: Invalidate feed cache after comment added
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });
    console.log('✅ Feed cache invalidated after comment added');

    // XP for commenter + post owner
    await addXP(String(req.user._id), 'comment');
    if (String(post.userId) !== String(req.user._id)) {
      await addXP(String(post.userId), 'comment_received');
    }

    // Notify post owner (not self)
    if (String(post.userId) !== String(req.user._id)) {
      const notif = await Notification.create({
        recipient: post.userId,
        sender: req.user._id,
        type: 'comment',
        postId: post._id,
        message: `${req.user.name} commented on your post`,
      });
      const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
      const io = req.app.get('io');
      emitNotification(io, String(post.userId), populated);
      // Push to device even if app/browser is closed
      sendPushToUser(String(post.userId), {
        title: 'Studdy Buddy',
        body: `${req.user.name} commented on your post`,
        icon: req.user.profileImage || '/icons/icon-192x192.png',
        url: '/feed',
        type: 'comment',
      });
    }

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(201).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to add comment' } });
  }
});

// PUT /api/feed/:postId/comment/:commentId - Edit comment
router.put('/:postId/comment/:commentId', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Comment cannot be empty' } });
    }

    // Content moderation - block abusive words
    const modResult = checkContent(content);
    if (modResult.blocked) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          message: modResult.reason,
          code: 'CONTENT_BLOCKED'
        } 
      });
    }

    const post = await FeedPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: { message: 'Comment not found' } });

    // Check if user owns the comment
    if (String(comment.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to edit this comment' } });
    }

    comment.content = content.trim();
    await post.save();

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(200).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to edit comment' } });
  }
});

// DELETE /api/feed/:postId/comment/:commentId - Delete comment
router.delete('/:postId/comment/:commentId', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: { message: 'Comment not found' } });

    // Check if user owns the comment or owns the post
    const isCommentOwner = String(comment.userId) === String(req.user._id);
    const isPostOwner = String(post.userId) === String(req.user._id);
    
    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to delete this comment' } });
    }

    // Use pull to remove the comment from the array
    post.comments.pull(req.params.commentId);
    await post.save();

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(200).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete comment' } });
  }
});

// POST /api/feed/:postId/comment/:commentId/reply - Add reply to a comment
router.post('/:postId/comment/:commentId/reply', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Reply cannot be empty' } });
    }

    const post = await FeedPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: { message: 'Comment not found' } });

    // Initialize replies array if it doesn't exist
    if (!comment.replies) comment.replies = [];

    // Add reply to comment
    comment.replies.push({ 
      userId: req.user._id, 
      content: content.trim(),
      createdAt: new Date()
    });
    await post.save();

    // Invalidate cache
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });

    // XP for replier + comment owner
    await addXP(String(req.user._id), 'comment');
    if (String(comment.userId) !== String(req.user._id)) {
      await addXP(String(comment.userId), 'comment_received');

      // Send notification to comment owner
      const notif = await Notification.create({
        recipient: comment.userId,
        sender: req.user._id,
        type: 'reply',
        postId: post._id,
        message: `${req.user.name} replied to your comment`,
      });
      const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
      
      // Emit notification via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${comment.userId}`).emit('notification', populated);
      }

      sendPushToUser(String(comment.userId), {
        title: 'Studdy Buddy',
        body: `${req.user.name} replied to your comment`,
        icon: req.user.profileImage || '/icons/icon-192x192.png',
        url: '/feed',
        type: 'reply',
      });
    }

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(201).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    console.error('Add reply error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to add reply' } });
  }
});

// DELETE /api/feed/:postId/comment/:commentId/reply/:replyId - Delete reply
router.delete('/:postId/comment/:commentId/reply/:replyId', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: { message: 'Comment not found' } });

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, error: { message: 'Reply not found' } });

    // Check if user owns the reply, comment, or post
    const isReplyOwner = String(reply.userId) === String(req.user._id);
    const isCommentOwner = String(comment.userId) === String(req.user._id);
    const isPostOwner = String(post.userId) === String(req.user._id);

    if (!isReplyOwner && !isCommentOwner && !isPostOwner) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to delete this reply' } });
    }

    comment.replies.pull(req.params.replyId);
    await post.save();

    // Invalidate cache
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(200).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    console.error('Delete reply error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete reply' } });
  }
});

export default router;
