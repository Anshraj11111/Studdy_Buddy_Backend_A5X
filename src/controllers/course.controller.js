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
    // Fetch module WITHOUT populate - use manual fetch to avoid cross-connection issues
    const module = await Module.findById(req.params.id).lean();
    
    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }
    
    // Manually fetch resources using Resource model (same secondary DB connection)
    const resources = await Resource.find({ moduleId: req.params.id })
      .populate('uploadedBy', 'name profileImage')
      .sort({ order: 1 })
      .lean();
    
    // Check completion status if user is authenticated
    if (req.user) {
      const enrollment = await CourseEnrollment.findOne({
        userId: req.user._id,
        courseId: module.courseId,
      }).lean();
      
      if (enrollment) {
        const completedSet = new Set(
          enrollment.completedVideos.map(v => v.toString())
        );
        resources.forEach(resource => {
          resource.completed = completedSet.has(resource._id.toString());
        });
      }
    }
    
    module.resources = resources;
    
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
 * Get secure video URL (with token validation)
 * GET /api/courses/lectures/:lectureId/video-url
 */
export const getSecureVideoUrl = async (req, res) => {
  try {
    const { lectureId } = req.params;
    
    // Find the resource
    const resource = await Resource.findById(lectureId).lean();
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lecture not found' },
      });
    }
    
    // Find the module to get courseId
    const module = await Module.findOne({ resources: lectureId }).lean();
    
    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }
    
    // Check if user is enrolled in the course
    const enrollment = await CourseEnrollment.findOne({
      userId: req.user._id,
      courseId: module.courseId,
    }).lean();
    
    if (!enrollment && !req.user.hasPremiumAccess && !req.user.hasFreeAccess) {
      return res.status(403).json({
        success: false,
        error: { message: 'Please enroll in the course to access this content' },
      });
    }
    
    // Return the video URL (this will only be sent to authorized users)
    const videoUrl = resource.fileUrl || resource.url;
    
    if (!videoUrl) {
      return res.status(404).json({
        success: false,
        error: { message: 'Video URL not found in resource' },
      });
    }
    
    res.json({
      success: true,
      data: {
        url: videoUrl,
        title: resource.title,
        type: resource.type || resource.fileType,
      },
    });
  } catch (error) {
    console.error('Get secure video URL error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get video URL' },
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
      userId: req.user._id.toString(),
      courseId: courseId.toString(),
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
  getSecureVideoUrl,
  enrollInCourse,
  markVideoCompleted,
  getMyCourses,
};
