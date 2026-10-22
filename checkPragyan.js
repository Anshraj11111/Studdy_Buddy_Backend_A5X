import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import LectureProgress from './src/models/LectureProgress.js';
import CourseEnrollment from './src/models/CourseEnrollment.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔍 Checking Pragyan Soni...\n');
    
    const user = await User.findOne({ name: /pragyan.*soni/i });
    if (!user) { console.log('❌ Not found!'); process.exit(1); }
    
    console.log(`✅ User: ${user.name} (${user.email})`);
    console.log(`School: ${user.schoolName}`);
    console.log(`hasFreeAccess: ${user.hasFreeAccess}`);
    console.log(`XP: ${user.xp}\n`);
    
    // Check enrollments
    const enrollments = await CourseEnrollment.find({ userId: user._id }).populate('courseId', 'title');
    console.log(`📚 Enrollments: ${enrollments.length}`);
    enrollments.forEach(e => {
      console.log(`  - ${e.courseId?.title} | progress: ${e.progress}%`);
    });
    
    // Check lecture progress
    const progress = await LectureProgress.find({ userId: user._id }).populate('lectureId', 'title');
    console.log(`\n📊 Lecture Progress: ${progress.length} records`);
    progress.forEach(p => {
      console.log(`  - ${p.lectureId?.title || p.lectureId}: ${p.watchedPercentage}% | completed: ${p.isCompleted}`);
    });
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
