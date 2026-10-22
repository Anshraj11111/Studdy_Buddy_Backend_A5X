import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import LectureProgress from './src/models/LectureProgress.js';
import CourseEnrollment from './src/models/CourseEnrollment.js';
import Course from './src/models/Course.js';
import Resource from './src/models/Resource.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔧 Fixing Sartaj Khan...\n');
    
    const user = await User.findOne({ name: /sartaj/i });
    if (!user) { console.log('❌ Not found'); process.exit(1); }
    
    console.log(`✅ Found: ${user.name} (${user.email})`);
    
    // Fix 1: Set hasFreeAccess = true
    user.hasFreeAccess = true;
    user.schoolName = 'CCSS';
    await user.save();
    console.log('✅ Fixed hasFreeAccess = true');
    
    // Fix 2: Mark all incomplete lectures as completed
    const allProgress = await LectureProgress.find({ userId: user._id });
    console.log(`\n📊 Found ${allProgress.length} lecture progress records`);
    
    let fixed = 0;
    for (const prog of allProgress) {
      if (!prog.isCompleted) {
        prog.isCompleted = true;
        prog.watchedPercentage = 100;
        await prog.save();
        fixed++;
        console.log(`✅ Marked complete: ${prog.lectureId}`);
      }
    }
    console.log(`\n✅ Fixed ${fixed} incomplete lectures`);
    
    // Fix 3: Update enrollment progress
    const enrollment = await CourseEnrollment.findOne({ userId: user._id });
    if (enrollment) {
      enrollment.progress = Math.max(enrollment.progress, 50);
      await enrollment.save();
      console.log(`✅ Updated enrollment progress to ${enrollment.progress}%`);
    }
    
    console.log('\n✅ Sartaj fixed! He can now access all lectures.');
    console.log('Tell him: "Refresh karo aur dobara try karo!"');
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
