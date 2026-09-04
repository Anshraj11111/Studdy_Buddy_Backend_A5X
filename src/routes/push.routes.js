import express from 'express';
import PushSubscription from '../models/PushSubscription.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// GET /api/push/vapid-public-key — frontend needs this to subscribe
router.get('/vapid-public-key', (req, res) => {
  res.json({ success: true, data: { publicKey: process.env.VAPID_PUBLIC_KEY } });
});

// POST /api/push/subscribe — save user's push subscription
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid subscription object' },
      });
    }

    const userAgent = req.headers['user-agent'] || '';

    // Upsert: update if endpoint exists, insert if new
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys, userAgent },
      { upsert: true, returnDocument: 'after' }
    );

    res.status(201).json({ success: true, data: { message: 'Subscribed to push notifications' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to save subscription' } });
  }
});

// DELETE /api/push/unsubscribe — remove subscription on logout/unsubscribe
router.delete('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (endpoint) {
      // Remove specific device subscription
      await PushSubscription.deleteOne({ user: req.user._id, endpoint });
    } else {
      // Remove all subscriptions for this user
      await PushSubscription.deleteMany({ user: req.user._id });
    }

    res.json({ success: true, data: { message: 'Unsubscribed from push notifications' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to remove subscription' } });
  }
});

export default router;
