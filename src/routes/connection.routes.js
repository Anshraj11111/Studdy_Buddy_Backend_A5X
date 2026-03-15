import express from 'express';
import Connection from '../models/Connection.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// GET /api/connections/users?search=&page=1  — discover all users
router.get('/users', authenticate, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      _id: { $ne: req.user._id },
    };

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { skills: { $regex: search.trim(), $options: 'i' } },
        { role: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('name email role skills profileImage')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Get connection status for each user
    const myConnections = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });

    const usersWithStatus = users.map(u => {
      const conn = myConnections.find(
        c =>
          String(c.requester) === String(u._id) ||
          String(c.recipient) === String(u._id)
      );
      return {
        ...u.toJSON(),
        connectionStatus: conn ? conn.status : null,
        connectionId: conn ? conn._id : null,
        iRequested: conn ? String(conn.requester) === String(req.user._id) : false,
      };
    });

    res.json({ success: true, data: { users: usersWithStatus, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch users' } });
  }
});

// POST /api/connections/request/:userId
router.post('/request/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ success: false, error: { message: 'Cannot connect with yourself' } });
    }

    const existing = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: userId },
        { requester: userId, recipient: req.user._id },
      ],
    });

    if (existing) {
      return res.status(400).json({ success: false, error: { message: 'Connection already exists' } });
    }

    const conn = await Connection.create({ requester: req.user._id, recipient: userId });
    res.status(201).json({ success: true, data: { connection: conn } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to send request' } });
  }
});

// PUT /api/connections/:id/accept
router.put('/:id/accept', authenticate, async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (String(conn.recipient) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    conn.status = 'accepted';
    await conn.save();
    res.json({ success: true, data: { connection: conn } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to accept' } });
  }
});

// PUT /api/connections/:id/reject
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (String(conn.recipient) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    await conn.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to reject' } });
  }
});

// DELETE /api/connections/:id  — withdraw request or remove connection
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    const uid = String(req.user._id);
    if (String(conn.requester) !== uid && String(conn.recipient) !== uid) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    await conn.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to remove' } });
  }
});

// GET /api/connections/pending  — requests I received
router.get('/pending', authenticate, async (req, res) => {
  try {
    const pending = await Connection.find({ recipient: req.user._id, status: 'pending' })
      .populate('requester', 'name email role skills profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { connections: pending } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch pending' } });
  }
});

// GET /api/connections/my  — my accepted connections
router.get('/my', authenticate, async (req, res) => {
  try {
    const conns = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    })
      .populate('requester', 'name email role skills profileImage')
      .populate('recipient', 'name email role skills profileImage')
      .sort({ updatedAt: -1 });

    const connections = conns.map(c => {
      const other =
        String(c.requester._id) === String(req.user._id) ? c.recipient : c.requester;
      return { connectionId: c._id, user: other };
    });

    res.json({ success: true, data: { connections } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch connections' } });
  }
});

export default router;
