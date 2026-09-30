import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';
import User from './src/models/User.js';

dotenv.config();

/**
 * Test script to verify admin panel will show plain text passwords
 */

async function testPasswordDisplay() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    console.log('═'.repeat(70));
    console.log('TEST 1: PreRegisteredStudent - Check Plain Password Field');
    console.log('═'.repeat(70));

    // Get 5 random pre-registered students
    const preRegStudents = await PreRegisteredStudent.find({})
      .limit(5)
      .select('name email schoolPassword schoolPasswordPlain isUsed');

    console.log(`\nFetched ${preRegStudents.length} pre-registered students:\n`);

    let preRegWithPlain = 0;
    let preRegWithoutPlain = 0;

    preRegStudents.forEach((student, idx) => {
      console.log(`${idx + 1}. ${student.name} (${student.email})`);
      console.log(`   Status: ${student.isUsed ? 'USED' : 'PENDING'}`);
      console.log(`   Has schoolPassword (hashed): ${student.schoolPassword ? 'YES' : 'NO'}`);
      console.log(`   Has schoolPasswordPlain: ${student.schoolPasswordPlain ? 'YES' : 'NO'}`);
      
      if (student.schoolPasswordPlain) {
        console.log(`   ✅ Plain Password: ${student.schoolPasswordPlain}`);
        preRegWithPlain++;
      } else {
        console.log(`   ⚠️  Plain Password: NOT AVAILABLE (hashed: ${student.schoolPassword?.substring(0, 20)}...)`);
        preRegWithoutPlain++;
      }
      console.log('');
    });

    console.log(`Summary: ${preRegWithPlain} with plain, ${preRegWithoutPlain} without plain\n`);

    console.log('═'.repeat(70));
    console.log('TEST 2: User Collection - Check Plain Password Field');
    console.log('═'.repeat(70));

    // Get 5 users with school passwords
    const users = await User.find({ schoolName: { $ne: '' } })
      .limit(5)
      .select('name email schoolName schoolPassword schoolPasswordPlain');

    console.log(`\nFetched ${users.length} users with school info:\n`);

    let usersWithPlain = 0;
    let usersWithoutPlain = 0;

    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name} (${user.email})`);
      console.log(`   School: ${user.schoolName}`);
      console.log(`   Has schoolPassword (hashed): ${user.schoolPassword ? 'YES' : 'NO'}`);
      console.log(`   Has schoolPasswordPlain: ${user.schoolPasswordPlain ? 'YES' : 'NO'}`);
      
      if (user.schoolPasswordPlain) {
        console.log(`   ✅ Plain Password: ${user.schoolPasswordPlain}`);
        usersWithPlain++;
      } else if (user.schoolPassword) {
        console.log(`   ⚠️  Plain Password: NOT AVAILABLE (hashed: ${user.schoolPassword?.substring(0, 20)}...)`);
        usersWithoutPlain++;
      }
      console.log('');
    });

    console.log(`Summary: ${usersWithPlain} with plain, ${usersWithoutPlain} without plain\n`);

    console.log('═'.repeat(70));
    console.log('TEST 3: Admin Controller Transformation Logic');
    console.log('═'.repeat(70));

    // Simulate what admin controller does
    const testStudent = preRegStudents[0];
    if (testStudent) {
      const studentObj = testStudent.toObject();
      
      console.log('\nBefore transformation:');
      console.log(`  schoolPassword: ${studentObj.schoolPassword?.substring(0, 30)}...`);
      console.log(`  schoolPasswordPlain: ${studentObj.schoolPasswordPlain || 'N/A'}`);
      
      // Apply transformation (what we added to admin controller)
      studentObj.schoolPassword = studentObj.schoolPasswordPlain || studentObj.schoolPassword;
      
      console.log('\nAfter transformation (what admin panel will show):');
      console.log(`  schoolPassword: ${studentObj.schoolPassword}`);
      console.log('  ✅ This is what admin will see!\n');
    }

    console.log('═'.repeat(70));
    console.log('FINAL VERDICT');
    console.log('═'.repeat(70));

    const totalPreReg = await PreRegisteredStudent.countDocuments({});
    const preRegWithPlainCount = await PreRegisteredStudent.countDocuments({ 
      schoolPasswordPlain: { $exists: true, $ne: '' } 
    });

    const totalUsers = await User.countDocuments({ schoolName: { $ne: '' } });
    const usersWithPlainCount = await User.countDocuments({ 
      schoolPasswordPlain: { $exists: true, $ne: '' } 
    });

    console.log('\n📊 Database Statistics:');
    console.log(`\nPreRegisteredStudent Collection:`);
    console.log(`  Total entries: ${totalPreReg}`);
    console.log(`  With plain password: ${preRegWithPlainCount} (${Math.round(preRegWithPlainCount/totalPreReg*100)}%)`);
    console.log(`  Without plain password: ${totalPreReg - preRegWithPlainCount}`);

    console.log(`\nUser Collection (with school):`);
    console.log(`  Total users: ${totalUsers}`);
    console.log(`  With plain password: ${usersWithPlainCount} (${Math.round(usersWithPlainCount/totalUsers*100)}%)`);
    console.log(`  Without plain password: ${totalUsers - usersWithPlainCount}`);

    console.log('\n✅ Admin Controller Changes:');
    console.log('  1. getPreRegisteredStudents - Transforms schoolPassword to show plain text');
    console.log('  2. updatePreRegisteredStudent - Returns plain text password in response');
    console.log('  3. getUsers - Transforms schoolPassword to show plain text');
    console.log('  4. updateUser - Returns plain text password in response');

    console.log('\n🎯 What This Means:');
    if (preRegWithPlainCount === totalPreReg) {
      console.log('  ✅ ALL pre-registered students have plain passwords available');
      console.log('  ✅ Admin can share passwords with ALL students easily');
    } else {
      console.log(`  ⚠️  ${totalPreReg - preRegWithPlainCount} pre-registered students missing plain passwords`);
      console.log('  ℹ️  These were added before the fix - admin can update them to set new passwords');
    }

    if (usersWithPlainCount > 0) {
      console.log(`  ✅ ${usersWithPlainCount} existing users have plain passwords available`);
    }

    console.log('\n💡 Recommendation for Missing Plain Passwords:');
    console.log('  1. Admin can edit student in admin panel');
    console.log('  2. Set a new school password');
    console.log('  3. System will store both hashed + plain text');
    console.log('  4. Plain text will be visible in admin panel\n');

    console.log('═'.repeat(70));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPasswordDisplay();
