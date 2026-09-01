import User from '../models/User.js';
import PreRegisteredStudent from '../models/PreRegisteredStudent.js';
import Payment from '../models/Payment.js';
import AppSettings from '../models/AppSettings.js';
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


// ========== PAYMENT MANAGEMENT ==========

/**
 * Get all payments (pending, approved, rejected)
 * GET /api/admin/payments
 */
export const getAllPayments = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (status !== 'all') {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate('userId', 'name email profileImage')
      .populate('reviewedBy', 'name email')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Payment.countDocuments(filter);
    const pendingCount = await Payment.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: { payments, total, pendingCount, page: Number(page) },
    });
  } catch (err) {
    console.error('Get all payments error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Approve payment - grants user access
 * PUT /api/admin/payments/:id/approve
 */
export const approvePayment = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment not found' },
      });
    }

    console.log('Approving payment:', { id: req.params.id, currentStatus: payment.status });

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: `Payment already ${payment.status}` },
      });
    }

    // Update payment status
    payment.status = 'approved';
    payment.adminNotes = adminNotes || '';
    payment.reviewedAt = new Date();
    
    // Use authenticated user if available, otherwise find admin
    let reviewedById = req.user?._id;
    if (!reviewedById) {
      const adminUser = await User.findOne({ role: 'admin' });
      reviewedById = adminUser?._id;
    }
    payment.reviewedBy = reviewedById;
    
    await payment.save();

    console.log('Payment approved, now granting user access:', payment.userId);

    // Grant user access by setting hasFreeAccess flag
    const user = await User.findById(payment.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    console.log('User found, updating premium status:', { userId: user._id, currentPremium: user.isPremium });
    
    // Set isPremium to true
    user.isPremium = true;
    
    // Add to paidCourses array
    user.paidCourses.push({
      courseId: payment.courseId,
      amount: payment.amount,
      transactionId: payment.transactionId,
      paidAt: new Date(),
    });
    
    // Update totalPaid
    user.totalPaid = (user.totalPaid || 0) + payment.amount;
    
    await user.save();

    res.json({
      success: true,
      data: { payment },
      message: 'Payment approved and access granted',
    });
  } catch (err) {
    console.error('Approve payment error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Reject payment
 * PUT /api/admin/payments/:id/reject
 */
export const rejectPayment = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment not found' },
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: `Payment already ${payment.status}` },
      });
    }

    // Update payment status
    payment.status = 'rejected';
    payment.adminNotes = adminNotes || '';
    payment.reviewedAt = new Date();
    
    // Use authenticated user if available, otherwise find admin
    let reviewedById = req.user?._id;
    if (!reviewedById) {
      const adminUser = await User.findOne({ role: 'admin' });
      reviewedById = adminUser?._id;
    }
    payment.reviewedBy = reviewedById;
    
    await payment.save();

    res.json({
      success: true,
      data: { payment },
      message: 'Payment rejected',
    });
  } catch (err) {
    console.error('Reject payment error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Get UPI settings
 * GET /api/admin/upi-settings
 */
export const getUpiSettings = async (req, res) => {
  try {
    let upiSetting = await AppSettings.findOne({ key: 'upi_id' });
    let priceSetting = await AppSettings.findOne({ key: 'payment_price' });
    
    if (!upiSetting) {
      upiSetting = await AppSettings.create({
        key: 'upi_id',
        value: '8269858259@upi',
        description: 'UPI ID for payment QR code',
      });
    }

    if (!priceSetting) {
      priceSetting = await AppSettings.create({
        key: 'payment_price',
        value: '500',
        description: 'Price per course in INR',
      });
    }

    res.json({
      success: true,
      data: { 
        upiId: upiSetting.value,
        paymentPrice: parseInt(priceSetting.value) || 500,
      },
    });
  } catch (err) {
    console.error('Get UPI settings error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update UPI settings
 * PUT /api/admin/upi-settings
 */
export const updateUpiSettings = async (req, res) => {
  try {
    const { upiId, paymentPrice } = req.body;

    if (!upiId && paymentPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'UPI ID or payment price is required' },
      });
    }

    const updates = {};

    // Update UPI ID
    if (upiId) {
      let upiSetting = await AppSettings.findOne({ key: 'upi_id' });
      
      if (upiSetting) {
        upiSetting.value = upiId;
        await upiSetting.save();
      } else {
        upiSetting = await AppSettings.create({
          key: 'upi_id',
          value: upiId,
          description: 'UPI ID for payment QR code',
        });
      }
      updates.upiId = upiSetting.value;
    }

    // Update payment price
    if (paymentPrice !== undefined) {
      const price = parseInt(paymentPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid payment price' },
        });
      }

      let priceSetting = await AppSettings.findOne({ key: 'payment_price' });
      
      if (priceSetting) {
        priceSetting.value = price.toString();
        await priceSetting.save();
      } else {
        priceSetting = await AppSettings.create({
          key: 'payment_price',
          value: price.toString(),
          description: 'Price per course in INR',
        });
      }
      updates.paymentPrice = price;
    }

    res.json({
      success: true,
      data: updates,
      message: 'Settings updated successfully',
    });
  } catch (err) {
    console.error('Update UPI settings error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ========== COURSE MANAGEMENT ==========

import Course from '../models/Course.js';
import Module from '../models/Module.js';

/**
 * Get all courses for admin
 * GET /api/admin/courses
 */
export const getAllCourses = async (req, res) => {
  try {
    const { topic, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (topic) filter.topic = topic;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const courses = await Course.find(filter)
      .populate('createdBy', 'name email')
      .populate('modules')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Course.countDocuments(filter);

    res.json({
      success: true,
      data: { courses, total, page: Number(page) },
    });
  } catch (err) {
    console.error('Get all courses error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Create new course
 * POST /api/admin/courses
 */
export const createCourse = async (req, res) => {
  try {
    const courseData = req.body;
    
    // Use authenticated user if available
    let createdById = req.user?._id;
    if (!createdById) {
      const mentorUser = await User.findOne({ role: 'mentor' });
      if (!mentorUser) {
        const anyUser = await User.findOne();
        createdById = anyUser?._id;
      } else {
        createdById = mentorUser._id;
      }
    }
    
    courseData.createdBy = createdById;
    
    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      data: { course },
      message: 'Course created successfully',
    });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update course
 * PUT /api/admin/courses/:id
 */
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        error: { message: 'Course not found' },
      });
    }

    res.json({
      success: true,
      data: { course },
      message: 'Course updated successfully',
    });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Delete course
 * DELETE /api/admin/courses/:id
 */
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: { message: 'Course not found' },
      });
    }

    // Delete associated modules
    await Module.deleteMany({ courseId: course._id });

    res.json({
      success: true,
      data: { message: 'Course deleted successfully' },
    });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Create module in course
 * POST /api/admin/courses/:courseId/modules
 */
export const createModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const moduleData = { ...req.body, courseId };

    const module = await Module.create(moduleData);

    // Add module to course
    await Course.findByIdAndUpdate(courseId, {
      $push: { modules: module._id },
    });

    res.status(201).json({
      success: true,
      data: { module },
      message: 'Module created successfully',
    });
  } catch (err) {
    console.error('Create module error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update module
 * PUT /api/admin/modules/:id
 */
export const updateModule = async (req, res) => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }

    res.json({
      success: true,
      data: { module },
      message: 'Module updated successfully',
    });
  } catch (err) {
    console.error('Update module error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Delete module
 * DELETE /api/admin/modules/:id
 */
export const deleteModule = async (req, res) => {
  try {
    const module = await Module.findByIdAndDelete(req.params.id);

    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }

    // Remove module from course
    await Course.findByIdAndUpdate(module.courseId, {
      $pull: { modules: module._id },
    });

    res.json({
      success: true,
      data: { message: 'Module deleted successfully' },
    });
  } catch (err) {
    console.error('Delete module error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

import Resource from '../models/Resource.js';

/**
 * Get course modules with lectures
 * GET /api/admin/courses/:courseId/modules
 */
export const getCourseModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const modules = await Module.find({ courseId })
      .populate('resources')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: { modules },
    });
  } catch (err) {
    console.error('Get course modules error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Create module
 * POST /api/admin/modules
 */
export const createModuleStandalone = async (req, res) => {
  try {
    const moduleData = req.body;
    const module = await Module.create(moduleData);

    // Add module to course
    await Course.findByIdAndUpdate(moduleData.courseId, {
      $push: { modules: module._id },
    });

    res.status(201).json({
      success: true,
      data: { module },
      message: 'Module created successfully',
    });
  } catch (err) {
    console.error('Create module error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Create lecture (resource) in module
 * POST /api/admin/lectures
 */
export const createLecture = async (req, res) => {
  try {
    const lectureData = req.body;
    
    // Use authenticated user if available
    let uploadedById = req.user?._id;
    if (!uploadedById) {
      const mentorUser = await User.findOne({ role: 'mentor' });
      if (!mentorUser) {
        const anyUser = await User.findOne();
        uploadedById = anyUser?._id;
      } else {
        uploadedById = mentorUser._id;
      }
    }
    
    lectureData.uploadedBy = uploadedById;
    lectureData.isPublic = false; // Course lectures are not public by default
    
    const lecture = await Resource.create(lectureData);

    // Add lecture to module
    await Module.findByIdAndUpdate(lectureData.moduleId, {
      $push: { resources: lecture._id },
      $inc: { videoCount: 1 },
    });

    // Update course totalVideos count
    if (lectureData.courseId) {
      await Course.findByIdAndUpdate(lectureData.courseId, {
        $inc: { totalVideos: 1 },
      });
    }

    res.status(201).json({
      success: true,
      data: { lecture },
      message: 'Lecture created successfully',
    });
  } catch (err) {
    console.error('Create lecture error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update lecture
 * PUT /api/admin/lectures/:id
 */
export const updateLecture = async (req, res) => {
  try {
    const lecture = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!lecture) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lecture not found' },
      });
    }

    res.json({
      success: true,
      data: { lecture },
      message: 'Lecture updated successfully',
    });
  } catch (err) {
    console.error('Update lecture error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Delete lecture
 * DELETE /api/admin/lectures/:id
 */
export const deleteLecture = async (req, res) => {
  try {
    const lecture = await Resource.findByIdAndDelete(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lecture not found' },
      });
    }

    // Remove lecture from module
    if (lecture.moduleId) {
      await Module.findByIdAndUpdate(lecture.moduleId, {
        $pull: { resources: lecture._id },
        $inc: { videoCount: -1 },
      });
    }

    // Update course totalVideos count
    if (lecture.courseId) {
      await Course.findByIdAndUpdate(lecture.courseId, {
        $inc: { totalVideos: -1 },
      });
    }

    res.json({
      success: true,
      data: { message: 'Lecture deleted successfully' },
    });
  } catch (err) {
    console.error('Delete lecture error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
