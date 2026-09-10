/**
 * Test Script: Verify Mentors Have Free Course Access
 * 
 * Usage: node testMentorAccess.js
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function testMentorAccess() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const dbUri = process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB\n');

    const User = (await import('./src/models/User.js')).default;

    // Test all mentors
    console.log('📋 Checking all mentors...\n');
    const mentors = await User.find({ role: 'mentor' });

    if (mentors.length === 0) {
      console.log('❌ No mentors found!');
      process.exit(1);
    }

    console.log(`Found ${mentors.length} mentors:\n`);

    mentors.forEach((mentor, i) => {
      const json = mentor.toJSON();
      console.log(`${i + 1}. ${mentor.name} (${mentor.email})`);
      console.log(`   Role: ${mentor.role}`);
      console.log(`   Has Free Access: ${json.hasFreeAccess ? '✅ YES' : '❌ NO'}`);
      console.log(`   School Name: ${mentor.schoolName || 'None'}`);
      console.log(`   School Password: ${mentor.schoolPassword ? 'Set' : 'Not set'}`);
      console.log(`   Is Premium: ${mentor.isPremium ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Test students for comparison
    console.log('📋 Checking students (for comparison)...\n');
    const students = await User.find({ role: 'student' }).limit(3);

    students.forEach((student, i) => {
      const json = student.toJSON();
      console.log(`${i + 1}. ${student.name} (${student.email})`);
      console.log(`   Role: ${student.role}`);
      console.log(`   Has Free Access: ${json.hasFreeAccess ? '✅ YES' : '❌ NO'}`);
      console.log(`   School Name: ${student.schoolName || 'None'}`);
      console.log(`   School Password: ${student.schoolPassword ? 'Set' : 'Not set'}`);
      console.log(`   Is Premium: ${student.isPremium ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('✅ Test completed!');
    console.log('\n📱 Expected Results:');
    console.log('   - All mentors should have hasFreeAccess = true');
    console.log('   - Students with school credentials should have hasFreeAccess = true');
    console.log('   - Students without school credentials should have hasFreeAccess = false (unless premium)');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testMentorAccess();
