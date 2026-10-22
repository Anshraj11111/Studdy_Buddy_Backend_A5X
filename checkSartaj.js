import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import LectureProgress from './src/models/LectureProgress.js';
import CourseEnrollment from './src/models/CourseEnrollment.js';
import Course from './src/models/Course.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';
import Resource from './src/models/Resource.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔍 Checking Sartaj Khan...\n');
    
    // Find user
    const users = await User.find({ name: /sartaj/i });
    console.log(`Found ${users.length} user(s):\n`);
    
    for (const user of users) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`School: ${user.schoolName}`);
      console.log(`hasFreeAccess: ${user.hasFreeAccess}`);
      
      // Check enrollments
      const enrollments = await CourseEnrollment.find({ userId: user._id })
        .populate('courseId', 'title');
      console.log(`\nEnrollments: ${enrollments.length}`);
      enrollments.forEach(e => {
        console.log(`  - ${e.courseId?.title} | progress: ${e.progress}%`);
      });
      
      // Check lecture progress
      const progress = await LectureProgress.find({ userId: user._id })
        .populate('lectureId', 'title');
      console.log(`\nLecture Progress: ${progress.length} records`);
      progress.forEach(p => {
        console.log(`  - ${p.lectureId?.title || 'Unknown'}`);
        console.log(`    Watched: ${p.watchedPercentage}% | Completed: ${p.isCompleted ? '✅' : '❌'}`);
      });
    }
    
    if (users.length === 0) {
      console.log('❌ No user found with name "sartaj"');
      console.log('Checking by email pattern...');
      const byEmail = await User.find({ email: /sartaj/i });
      byEmail.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    }
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
