import User from '../models/User.js';
import PreRegisteredStudent from '../models/PreRegisteredStudent.js';
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

// Pre-register student with school password
export const preRegisterStudent = async (req, res) => {
  try {
    const { name, email, phone, schoolPassword, schoolName } = req.body;

    // Validation
    if (!name || !email || !schoolPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, email, and school password are required' },
      });
    }

    // Check if email already pre-registered
    const existing = await PreRegisteredStudent.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email already pre-registered' },
      });
    }

    // Check if email already used by a registered user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email already registered by a user' },
      });
    }

    // Use authenticated user if available, otherwise find any admin user
    let createdById = req.user?._id;
    if (!createdById) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        const anyUser = await User.findOne();
        createdById = anyUser?._id;
      } else {
        createdById = adminUser._id;
      }
    }

    // Create pre-registered student
    const preRegistered = await PreRegisteredStudent.create({
      name,
      email,
      phone: phone || '',
      schoolName: schoolName || '',
      schoolPassword,
      createdBy: createdById,
    });

    res.status(201).json({
      success: true,
      data: { preRegistered },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Get all pre-registered students
export const getPreRegisteredStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 500, status = 'all', schoolName } = req.query;
    const filter = {};
    
    if (status === 'unused') filter.isUsed = false;
    if (status === 'used') filter.isUsed = true;
    
    if (schoolName && schoolName !== 'all') {
      filter.schoolName = schoolName;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await PreRegisteredStudent.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await PreRegisteredStudent.countDocuments(filter);

    res.json({
      success: true,
      data: { students, total, page: Number(page) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Get unique school codes
export const getSchoolCodes = async (req, res) => {
  try {
    const schoolCodes = await PreRegisteredStudent.distinct('schoolName');
    // Filter out empty/null values and sort
    const validCodes = schoolCodes.filter(code => code && code.trim()).sort();
    
    res.json({
      success: true,
      data: { schoolCodes: validCodes },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Delete pre-registered student
export const deletePreRegisteredStudent = async (req, res) => {
  try {
    const student = await PreRegisteredStudent.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: { message: 'Pre-registered student not found' },
      });
    }

    res.json({
      success: true,
      data: { message: 'Pre-registered student deleted' },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Update pre-registered student
export const updatePreRegisteredStudent = async (req, res) => {
  try {
    const { name, email, phone, schoolPassword } = req.body;
    
    const student = await PreRegisteredStudent.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: { message: 'Pre-registered student not found' },
      });
    }

    if (student.isUsed) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot update - student already registered' },
      });
    }

    if (name) student.name = name;
    if (email) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (schoolPassword) student.schoolPassword = schoolPassword;

    await student.save();

    res.json({
      success: true,
      data: { student },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
