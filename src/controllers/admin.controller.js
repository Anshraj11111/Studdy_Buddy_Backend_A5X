import User from '../models/User.js';
import mongoose from 'mongoose';

// Lazy-load models to avoid circular deps
const getDoubt = async () => (await import('../models/Doubt.js')).default;
const getResource = async () => (await import('../models/Resource.js')).default;

export const getStats = async (req, res) => {
  try {
    const [totalUsers, totalMentors, totalStudents] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'mentor' }),
      User.countDocuments({ role: 'student' }),
    ]);

    let totalDoubts = 0, totalResources = 0;
    try { const Doubt = await getDoubt(); totalDoubts = await Doubt.countDocuments(); } catch {}
    try { const Resource = await getResource(); totalResources = await Resource.countDocuments(); } catch {}

    res.json({
      success: true,
      data: { totalUsers, totalMentors, totalStudents, totalDoubts, totalResources },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.json({ success: true, data: { users, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
