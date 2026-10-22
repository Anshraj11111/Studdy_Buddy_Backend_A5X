import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import CourseEnrollment from './src/models/CourseEnrollment.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔍 Checking Garima from Bardsley...\n');
    
    // Search by name
    const users = await User.find({ name: /garima/i });
    console.log(`Found ${users.length} user(s) with name "garima":`);
    
    for (const user of users) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`School: ${user.schoolName}`);
      console.log(`hasFreeAccess: ${user.hasFreeAccess}`);
      console.log(`schoolPassword stored: ${user.schoolPassword ? 'YES' : 'NO'}`);
      console.log(`Created: ${user.createdAt}`);
      
      // Check PreReg
      const preReg = await PreRegisteredStudent.findOne({ email: user.email });
      console.log(`PreReg entry: ${preReg ? 'YES' : 'NO'}`);
      if (preReg) {
        console.log(`  PreReg school: ${preReg.schoolName}`);
        console.log(`  PreReg isUsed: ${preReg.isUsed}`);
      }
      
      // Check enrollments
      const enrollments = await CourseEnrollment.find({ userId: user._id }).populate('courseId', 'title isPremium');
      console.log(`Enrollments: ${enrollments.length}`);
      enrollments.forEach(e => {
        console.log(`  - ${e.courseId?.title} | premium: ${e.courseId?.isPremium} | progress: ${e.progress}%`);
      });
    }
    
    if (users.length === 0) {
      console.log('❌ No user found with name "garima"!');
      console.log('\nSearching PreReg for garima...');
      const preRegs = await PreRegisteredStudent.find({ name: /garima/i });
      console.log(`PreReg entries: ${preRegs.length}`);
      preRegs.forEach(p => {
        console.log(`  - ${p.name} | ${p.email} | school: ${p.schoolName} | isUsed: ${p.isUsed}`);
      });
    }
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
