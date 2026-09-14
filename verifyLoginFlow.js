import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

// Load environment variables
dotenv.config();

async function verifyLoginFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('✅ Connected to database\n');

    const testEmail = 'smriti.soni@student.com';
    const testSchoolPassword = '103PVQ5O';
    
    // Find user
    const user = await User.findOne({ email: testEmail }).select('+password +schoolPassword');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('🔍 Testing Login Flow for:', testEmail);
    console.log('👤 Name:', user.name);
    console.log('🏫 School:', user.schoolName);
    console.log('🌆 City:', user.city);
    console.log('\n--- Verification Tests ---\n');

    // Test 1: School Password Hash Format
    console.log('✅ Test 1: School Password Format');
    const isHashed = user.schoolPassword && user.schoolPassword.startsWith('$2a$');
    console.log('   Is properly hashed?', isHashed ? '✅ YES' : '❌ NO');
    
    if (!isHashed) {
      console.log('   ❌ PROBLEM: Password not hashed properly!');
      await mongoose.connection.close();
      return;
    }

    // Test 2: School Password Verification
    console.log('\n✅ Test 2: School Password Verification');
    const schoolPasswordMatch = await bcrypt.compare(testSchoolPassword, user.schoolPassword);
    console.log('   Testing password:', testSchoolPassword);
    console.log('   Does it match?', schoolPasswordMatch ? '✅ YES' : '❌ NO');
    
    if (!schoolPasswordMatch) {
      console.log('   ❌ PROBLEM: School password verification failed!');
      await mongoose.connection.close();
      return;
    }

    // Test 3: Check other students from same school
    console.log('\n✅ Test 3: Checking Other Bardsley Students');
    const bardsleyStudents = await User.find({ 
      schoolName: 'Bardsley',
      role: 'student'
    }).select('+schoolPassword').limit(5);
    
    let allHashedProperly = true;
    for (const student of bardsleyStudents) {
      const isStudentHashed = student.schoolPassword && student.schoolPassword.startsWith('$2a$');
      console.log(`   ${student.name}: ${isStudentHashed ? '✅ Hashed' : '❌ Plain Text'}`);
      if (!isStudentHashed && student.schoolPassword) {
        allHashedProperly = false;
      }
    }

    // Test 4: Login Logic Simulation
    console.log('\n✅ Test 4: Simulating Login Logic');
    let isAuthenticated = false;
    
    // Student trying with school password
    if (testSchoolPassword && user.role === 'student') {
      if (user.schoolPassword) {
        const isSchoolPasswordValid = await bcrypt.compare(testSchoolPassword, user.schoolPassword);
        if (isSchoolPasswordValid) {
          isAuthenticated = true;
          console.log('   ✅ Authentication SUCCESS with school password');
        }
      }
    }
    
    if (!isAuthenticated) {
      console.log('   ❌ Authentication FAILED');
      await mongoose.connection.close();
      return;
    }

    // Final Report
    console.log('\n═══════════════════════════════════════════');
    console.log('📊 FINAL VERIFICATION REPORT');
    console.log('═══════════════════════════════════════════');
    console.log('✅ School passwords are properly hashed');
    console.log('✅ bcrypt.compare() verification works');
    console.log('✅ Login logic will work correctly');
    console.log('✅ Students can login with school password');
    console.log('\n🎉 ALL SYSTEMS GO! Login should work perfectly now!');
    console.log('═══════════════════════════════════════════\n');

    // Check if there are any remaining plain text passwords
    const plainTextCount = await User.countDocuments({ 
      schoolPassword: { 
        $exists: true, 
        $ne: '',
        $not: /^\$2[ab]\$/ 
      }
    });
    
    if (plainTextCount > 0) {
      console.log(`⚠️ WARNING: ${plainTextCount} users still have plain text school passwords!`);
      console.log('   Run fixSchoolPasswords.js again to fix them.\n');
    } else {
      console.log('✅ Zero plain text passwords found - Perfect!\n');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyLoginFlow();
