import express from 'express';
import FeedPost from '../models/FeedPost.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// Helper: emit socket notification to a user
const emitNotification = (io, userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

// GET /api/feed?category=Robotics&page=1&limit=20
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (category && category !== 'All') query.category = category;
    if (search.trim()) {
      query.content = { $regex: search.trim(), $options: 'i' };
    }

    const posts = await FeedPost.find(query)
      .populate('userId', 'name profileImage role skills')
      .populate('comments.userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FeedPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
    });
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

    const post = await FeedPost.create({
      userId: req.user._id,
      content: content?.trim() || '',
      category,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
    });

    const populated = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role skills');

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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to delete post' } });
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

      // Notify post owner (not self)
      if (String(post.userId) !== uid) {
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
      }
    }
    await post.save();

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

    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    post.comments.push({ userId: req.user._id, content: content.trim() });
    await post.save();

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
    }

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage');

    res.status(201).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to add comment' } });
  }
});

export default router;
