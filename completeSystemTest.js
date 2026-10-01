import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const TESTS = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function logTest(emoji, category, message) {
  console.log(`${emoji} [${category}] ${message}`);
}

function pass(category, message) {
  TESTS.passed++;
  logTest('✅', category, message);
}

function fail(category, message) {
  TESTS.failed++;
  logTest('❌', category, message);
}

function warn(category, message) {
  TESTS.warnings++;
  logTest('⚠️', category, message);
}

async function testPasswordHashing() {
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 1: PASSWORD HASHING & AUTHENTICATION');
  console.log('═'.repeat(70));

  // Check all PreReg passwords are hashed
  const allPreRegs = await PreRegisteredStudent.find({});
  const plainTextPasswords = [];
  
  for (const preReg of allPreRegs) {
    if (preReg.schoolPassword && preReg.schoolPassword.length < 20) {
      plainTextPasswords.push({ email: preReg.email, password: preReg.schoolPassword });
    }
  }

  if (plainTextPasswords.length === 0) {
    pass('SECURITY', `All ${allPreRegs.length} PreReg passwords are properly hashed`);
  } else {
    fail('SECURITY', `Found ${plainTextPasswords.length} plain text passwords in PreReg`);
    plainTextPasswords.slice(0, 3).forEach(p => {
      console.log(`    - ${p.email}: "${p.password}"`);
    });
  }

  // Check specific test users
  const testUsers = [
    { email: 'lakshya.tiwari@student.com', plainPassword: 'OY7Z5NZV' },
    { email: 'pragyan.soni@student.com', plainPassword: 'E028RBPE' },
    { email: 'yatisharma@student.com', plainPassword: 'GATMOILS' }
  ];

  for (const testUser of testUsers) {
    const preReg = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^${testUser.email}$`, 'i') } 
    });
    
    if (preReg) {
      const isValid = await bcrypt.compare(testUser.plainPassword, preReg.schoolPassword);
      if (isValid) {
        pass('AUTH', `${testUser.email} password validation works`);
      } else {
        fail('AUTH', `${testUser.email} password validation FAILED`);
      }
    } else {
      warn('AUTH', `${testUser.email} not found in PreReg`);
    }
  }
}

async function testAdminPasswordDisplay() {
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 2: ADMIN PANEL PASSWORD DISPLAY');
  console.log('═'.repeat(70));

  const preRegsWithPlain = await PreRegisteredStudent.find({ 
    schoolPasswordPlain: { $exists: true, $ne: '' } 
  });

  console.log(`Found ${preRegsWithPlain.length} PreReg entries with schoolPasswordPlain`);

  if (preRegsWithPlain.length > 0) {
    pass('ADMIN', `${preRegsWithPlain.length} students have plain passwords for admin display`);
    
    // Sample check
    const sample = preRegsWithPlain.slice(0, 3);
    sample.forEach(p => {
      console.log(`    - ${p.email}: plain="${p.schoolPasswordPlain}" (${p.schoolPasswordPlain.length} chars)`);
    });
  } else {
    warn('ADMIN', 'No students have schoolPasswordPlain set');
  }

  // Check Bardsley students specifically
  const bardsleyWithPlain = await PreRegisteredStudent.countDocuments({
    schoolName: 'Bardsley',
    schoolPasswordPlain: { $exists: true, $ne: '' }
  });

  if (bardsleyWithPlain >= 212) {
    pass('ADMIN', `${bardsleyWithPlain} Bardsley students have plain passwords restored`);
  } else {
    fail('ADMIN', `Only ${bardsleyWithPlain} Bardsley students have plain passwords (expected 212+)`);
  }
}

async function testXPSystem() {
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 3: XP REWARD SYSTEM');
  console.log('═'.repeat(70));

  // Check if test users have XP
  const usersWithXP = await User.find({ xp: { $gt: 0 } }).limit(5);
  
  if (usersWithXP.length > 0) {
    pass('XP', `Found ${usersWithXP.length} users with XP points`);
    usersWithXP.forEach(u => {
      console.log(`    - ${u.name}: ${u.xp} XP`);
    });
  } else {
    warn('XP', 'No users have XP yet (system ready but not used)');
  }

  // Check specific test users from earlier tests
  const pragyan = await User.findOne({ email: 'pragyan.soni@student.com' });
  const anshu = await User.findOne({ name: 'Anshu Test' });

  if (pragyan) {
    console.log(`    Pragyan Soni XP: ${pragyan.xp || 0}`);
    if (pragyan.xp > 0) {
      pass('XP', 'Pragyan Soni has gained XP from community activity');
    }
  }

  if (anshu) {
    console.log(`    Anshu Test XP: ${anshu.xp || 0}`);
    if (anshu.xp > 0) {
      pass('XP', 'Anshu Test has gained XP from community activity');
    }
  }
}

async function testA5xUserAccess() {
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 4: A5X CCS USER ACCESS');
  console.log('═'.repeat(70));

  const user = await User.findOne({ email: 'a5xccss@ccs.com' });
  
  if (!user) {
    fail('ACCESS', 'A5x user not found');
    return;
  }

  console.log(`User: ${user.name} (${user.email})`);
  console.log(`  SchoolName: "${user.schoolName}" (length: ${user.schoolName?.length || 0})`);
  console.log(`  SchoolPassword: ${user.schoolPassword ? 'SET' : 'EMPTY'}`);
  console.log(`  City: "${user.city}"`);
  console.log(`  Role: ${user.role}`);
  console.log(`  IsPremium: ${user.isPremium}`);

  // Calculate hasFreeAccess
  const hasFreeAccess = user.role === 'mentor' || !!(user.schoolName && user.schoolPassword) || user.isPremium;
  console.log(`  HasFreeAccess: ${hasFreeAccess}`);

  if (user.schoolName === 'CCSS') {
    pass('ACCESS', 'A5x user has schoolName = "CCSS"');
  } else {
    fail('ACCESS', `A5x user schoolName = "${user.schoolName}" (expected "CCSS")`);
  }

  if (user.schoolPassword) {
    pass('ACCESS', 'A5x user has schoolPassword set');
  } else {
    fail('ACCESS', 'A5x user missing schoolPassword');
  }

  if (hasFreeAccess) {
    pass('ACCESS', 'A5x user HAS FREE ACCESS to all courses ✓');
  } else {
    fail('ACCESS', 'A5x user DOES NOT have course access');
  }

  // Check PreReg status
  const preReg = await PreRegisteredStudent.findOne({ 
    email: { $regex: new RegExp(`^${user.email}$`, 'i') } 
  });

  if (preReg) {
    console.log(`\nPreReg Status:`);
    console.log(`  SchoolName: "${preReg.schoolName}"`);
    console.log(`  IsUsed: ${preReg.isUsed}`);
    console.log(`  UsedAt: ${preReg.usedAt || 'N/A'}`);
    
    if (preReg.isUsed) {
      pass('ACCESS', 'PreReg marked as used');
    } else {
      warn('ACCESS', 'PreReg NOT marked as used');
    }
  } else {
    warn('ACCESS', 'No PreReg entry found for A5x user');
  }
}

async function testCourseAccessLogic() {
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 5: COURSE ACCESS LOGIC');
  console.log('═'.repeat(70));

  // Test different user scenarios
  const scenarios = [
    { schoolName: 'Bardsley', schoolPassword: 'hash123', isPremium: false, role: 'student', expected: true },
    { schoolName: '', schoolPassword: '', isPremium: true, role: 'student', expected: true },
    { schoolName: '', schoolPassword: '', isPremium: false, role: 'mentor', expected: true },
    { schoolName: '', schoolPassword: '', isPremium: false, role: 'student', expected: false },
    { schoolName: 'CCSS', schoolPassword: '', isPremium: false, role: 'student', expected: false }, // Missing password
    { schoolName: '', schoolPassword: 'hash123', isPremium: false, role: 'student', expected: false }, // Missing schoolName
  ];

  scenarios.forEach((scenario, index) => {
    const hasFreeAccess = scenario.role === 'mentor' || 
                         !!(scenario.schoolName && scenario.schoolPassword) || 
                         scenario.isPremium;
    
    const result = hasFreeAccess === scenario.expected ? '✅' : '❌';
    console.log(`  ${result} Scenario ${index + 1}: ${scenario.role}, ` +
                `school=${!!scenario.schoolName}, pass=${!!scenario.schoolPassword}, ` +
                `premium=${scenario.isPremium} → ${hasFreeAccess} (expected ${scenario.expected})`);
    
    if (hasFreeAccess === scenario.expected) {
      TESTS.passed++;
    } else {
      TESTS.failed++;
    }
  });
}

async function testDataIntegrity() {
  console.log('\n' + '═'.repeat(70));
  console.log('TEST 6: DATA INTEGRITY');
  console.log('═'.repeat(70));

  // Check for users with incomplete school info
  const usersWithOnlyPassword = await User.countDocuments({
    schoolPassword: { $exists: true, $ne: '' },
    $or: [
      { schoolName: { $exists: false } },
      { schoolName: '' }
    ],
    role: 'student'
  });

  if (usersWithOnlyPassword === 0) {
    pass('INTEGRITY', 'No users with schoolPassword but missing schoolName');
  } else {
    warn('INTEGRITY', `Found ${usersWithOnlyPassword} users with schoolPassword but no schoolName`);
  }

  // Check for users with incomplete school info (opposite)
  const usersWithOnlySchoolName = await User.countDocuments({
    schoolName: { $exists: true, $ne: '' },
    $or: [
      { schoolPassword: { $exists: false } },
      { schoolPassword: '' }
    ],
    role: 'student'
  });

  if (usersWithOnlySchoolName === 0) {
    pass('INTEGRITY', 'No users with schoolName but missing schoolPassword');
  } else {
    warn('INTEGRITY', `Found ${usersWithOnlySchoolName} users with schoolName but no schoolPassword`);
  }

  // Check total users and PreRegs
  const totalUsers = await User.countDocuments({});
  const totalPreRegs = await PreRegisteredStudent.countDocuments({});
  const usedPreRegs = await PreRegisteredStudent.countDocuments({ isUsed: true });

  console.log(`\nDatabase Stats:`);
  console.log(`  Total Users: ${totalUsers}`);
  console.log(`  Total PreRegs: ${totalPreRegs}`);
  console.log(`  Used PreRegs: ${usedPreRegs}`);
  console.log(`  Unused PreRegs: ${totalPreRegs - usedPreRegs}`);

  pass('INTEGRITY', `Database has ${totalUsers} users and ${totalPreRegs} PreReg entries`);
}

async function runAllTests() {
  try {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║         STUDDY BUDDY - COMPLETE SYSTEM TEST                        ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    await testPasswordHashing();
    await testAdminPasswordDisplay();
    await testXPSystem();
    await testA5xUserAccess();
    await testCourseAccessLogic();
    await testDataIntegrity();

    // Final Summary
    console.log('\n' + '═'.repeat(70));
    console.log('FINAL TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Passed: ${TESTS.passed}`);
    console.log(`❌ Failed: ${TESTS.failed}`);
    console.log(`⚠️  Warnings: ${TESTS.warnings}`);
    console.log(`📊 Total: ${TESTS.passed + TESTS.failed + TESTS.warnings}`);
    
    const successRate = ((TESTS.passed / (TESTS.passed + TESTS.failed)) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (TESTS.failed === 0) {
      console.log('\n🎉 ALL CRITICAL TESTS PASSED! System ready for push.');
    } else {
      console.log(`\n⚠️  ${TESTS.failed} critical test(s) failed. Please fix before push.`);
    }

    if (TESTS.warnings > 0) {
      console.log(`ℹ️  ${TESTS.warnings} warning(s) detected (non-critical).`);
    }

    console.log('\n' + '═'.repeat(70));

    await mongoose.connection.close();
    process.exit(TESTS.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ TEST SUITE ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runAllTests();
