import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Resource from '../models/Resource.js';
import CourseEnrollment from '../models/CourseEnrollment.js';

/**
 * Get all courses (with filtering)
 * GET /api/courses
 */
export const getAllCourses = async (req, res) => {
  try {
    const { topic, difficulty, isPremium, search, sort = '-createdAt' } = req.query;
    
    const filter = { isActive: true };
    
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (isPremium !== undefined) filter.isPremium = isPremium === 'true';
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }
    
    const courses = await Course.find(filter)
      .populate('createdBy', 'name profileImage')
      .sort(sort)
      .lean();
    
    // Add enrollment status for authenticated user
    if (req.user) {
      const enrollments = await CourseEnrollment.find({
        userId: req.user._id,
        courseId: { $in: courses.map(c => c._id) },
      }).lean();
      
      const enrollmentMap = {};
      enrollments.forEach(e => {
        enrollmentMap[e.courseId.toString()] = e;
      });
      
      courses.forEach(course => {
        course.enrollment = enrollmentMap[course._id.toString()] || null;
      });
    }
    
    res.json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch courses' },
    });
  }
};

/**
 * Get single course with modules
 * GET /api/courses/:id
 */
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name profileImage')
      .populate({
        path: 'modules',
        options: { sort: { order: 1 } },
      })
      .lean();
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { message: 'Course not found' },
      });
    }
    
    // Check enrollment
    let enrollment = null;
    if (req.user) {
      enrollment = await CourseEnrollment.findOne({
        userId: req.user._id,
        courseId: course._id,
      }).lean();
    }
    
    course.enrollment = enrollment;
    
    res.json({
      success: true,
      data: { course },
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch course' },
    });
  }
};

/**
 * Get module lectures
 * GET /api/modules/:id/lectures
 */
export const getModuleLectures = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id)
      .populate({
        path: 'resources',
        options: { sort: { order: 1 } },
        populate: { path: 'uploadedBy', select: 'name profileImage' },
      })
      .lean();
    
    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }
    
    // Check if user has completed each video
    if (req.user) {
      const enrollment = await CourseEnrollment.findOne({
        userId: req.user._id,
        courseId: module.courseId,
      }).lean();
      
      if (enrollment) {
        const completedSet = new Set(
          enrollment.completedVideos.map(v => v.toString())
        );
        
        module.resources.forEach(resource => {
          resource.completed = completedSet.has(resource._id.toString());
        });
      }
    }
    
    res.json({
      success: true,
      data: { module },
    });
  } catch (error) {
    console.error('Get lectures error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch lectures' },
    });
  }
};

/**
 * Enroll in course
 * POST /api/courses/:id/enroll
 */
export const enrollInCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { message: 'Course not found' },
      });
    }
    
    // Check if already enrolled
    const existing = await CourseEnrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { message: 'Already enrolled in this course' },
      });
    }
    
    // Check if premium and user has access
    if (course.isPremium && !req.user.hasPremiumAccess && !req.user.hasFreeAccess) {
      return res.status(403).json({
        success: false,
        error: { message: 'Premium access required' },
      });
    }
    
    // Create enrollment
    const enrollment = await CourseEnrollment.create({
      userId: req.user._id,
      courseId: course._id,
    });
    
    // Increment enrolled count
    course.enrolledCount += 1;
    await course.save();
    
    res.status(201).json({
      success: true,
      data: { enrollment },
      message: 'Successfully enrolled in course',
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to enroll in course' },
    });
  }
};

/**
 * Mark video as completed
 * POST /api/courses/:courseId/videos/:videoId/complete
 */
export const markVideoCompleted = async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    
    const enrollment = await CourseEnrollment.findOne({
      userId: req.user._id,
      courseId,
    });
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Not enrolled in this course' },
      });
    }
    
    // Add to completed if not already
    if (!enrollment.completedVideos.includes(videoId)) {
      enrollment.completedVideos.push(videoId);
      enrollment.lastWatchedVideo = videoId;
      enrollment.lastAccessedAt = new Date();
      
      // Calculate progress
      const course = await Course.findById(courseId);
      enrollment.progress = Math.round(
        (enrollment.completedVideos.length / course.totalVideos) * 100
      );
      
      await enrollment.save();
    }
    
    res.json({
      success: true,
      data: { enrollment },
    });
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update progress' },
    });
  }
};

/**
 * Get my enrolled courses
 * GET /api/courses/my-courses
 */
export const getMyCourses = async (req, res) => {
  try {
    const enrollments = await CourseEnrollment.find({
      userId: req.user._id,
    })
      .populate({
        path: 'courseId',
        populate: { path: 'createdBy', select: 'name profileImage' },
      })
      .sort({ lastAccessedAt: -1 })
      .lean();
    
    const courses = enrollments
      .filter(e => e.courseId) // Filter out deleted courses
      .map(e => ({
        ...e.courseId,
        enrollment: {
          progress: e.progress,
          lastAccessedAt: e.lastAccessedAt,
          enrolledAt: e.enrolledAt,
        },
      }));
    
    res.json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch enrolled courses' },
    });
  }
};

export default {
  getAllCourses,
  getCourseById,
  getModuleLectures,
  enrollInCourse,
  markVideoCompleted,
  getMyCourses,
};
