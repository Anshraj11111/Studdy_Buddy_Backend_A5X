/**
 * Check actual database counts vs what admin panel shows
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function checkCounts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // User counts
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalMentors = await User.countDocuments({ role: 'mentor' });
    const studentsWithSchoolPassword = await User.countDocuments({
      role: 'student',
      schoolPassword: { $exists: true, $ne: '' }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 USER MODEL (All Users):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`  - Students: ${totalStudents}`);
    console.log(`  - Mentors: ${totalMentors}`);
    console.log(`  - Students with School Password: ${studentsWithSchoolPassword}`);
    console.log();

    // PreRegisteredStudent counts
    const totalPreReg = await PreRegisteredStudent.countDocuments();
    const usedPreReg = await PreRegisteredStudent.countDocuments({ isUsed: true });
    const unusedPreReg = await PreRegisteredStudent.countDocuments({ isUsed: false });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 PRE-REGISTERED STUDENT MODEL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Pre-Registered: ${totalPreReg}`);
    console.log(`  - Used (Registered): ${usedPreReg}`);
    console.log(`  - Unused (Pending): ${unusedPreReg}`);
    console.log();

    // Cross-check: How many used pre-reg students actually exist in User model?
    const usedEmails = await PreRegisteredStudent.find({ isUsed: true }).select('email').lean();
    const userEmails = await User.find({ role: 'student' }).select('email').lean();
    
    const usedEmailSet = new Set(usedEmails.map(u => u.email));
    const userEmailSet = new Set(userEmails.map(u => u.email));
    
    const usedButNotRegistered = usedEmails.filter(u => !userEmailSet.has(u.email));
    const registeredButNotMarkedUsed = userEmails.filter(u => !usedEmailSet.has(u.email));

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DATA CONSISTENCY CHECK:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Used PreReg students who ARE in User model: ${usedPreReg - usedButNotRegistered.length}`);
    console.log(`❌ Used PreReg students NOT in User model: ${usedButNotRegistered.length}`);
    console.log(`⚠️  Registered users NOT marked as used: ${registeredButNotMarkedUsed.length}`);
    console.log();

    if (usedButNotRegistered.length > 0) {
      console.log('❌ MARKED AS USED BUT NOT REGISTERED:');
      usedButNotRegistered.slice(0, 10).forEach(u => console.log(`   - ${u.email}`));
      if (usedButNotRegistered.length > 10) {
        console.log(`   ... and ${usedButNotRegistered.length - 10} more`);
      }
      console.log();
    }

    if (registeredButNotMarkedUsed.length > 0) {
      console.log('⚠️  REGISTERED BUT NOT MARKED AS USED:');
      registeredButNotMarkedUsed.slice(0, 10).forEach(u => console.log(`   - ${u.email}`));
      if (registeredButNotMarkedUsed.length > 10) {
        console.log(`   ... and ${registeredButNotMarkedUsed.length - 10} more`);
      }
      console.log();
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 EXPECTED VS ACTUAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Panel Shows:');
    console.log('  All Users: 188 (shown)');
    console.log('  Pre-Registered Total: 215 (shown)');
    console.log('  Used: 72 (shown)');
    console.log('  Unused: 153 (shown)');
    console.log();
    console.log('Database Has:');
    console.log(`  All Users: ${totalUsers} (actual)`);
    console.log(`  Pre-Registered Total: ${totalPreReg} (actual)`);
    console.log(`  Used: ${usedPreReg} (actual)`);
    console.log(`  Unused: ${unusedPreReg} (actual)`);
    console.log();
    console.log('Math Check:');
    console.log(`  ${usedPreReg} (used) + ${unusedPreReg} (unused) = ${usedPreReg + unusedPreReg} (should equal ${totalPreReg})`);
    console.log(`  ✅ Total matches: ${usedPreReg + unusedPreReg === totalPreReg ? 'YES' : 'NO'}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

checkCounts();
