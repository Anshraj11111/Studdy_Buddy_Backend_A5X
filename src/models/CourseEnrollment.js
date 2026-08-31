import mongoose from 'mongoose';

const courseEnrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
  }],
  lastWatchedVideo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  certificateIssued: {
    type: Boolean,
    default: false,
  },
  certificateIssuedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound index to prevent duplicate enrollments
courseEnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const CourseEnrollment = mongoose.model('CourseEnrollment', courseEnrollmentSchema);

export default CourseEnrollment;
