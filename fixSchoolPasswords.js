import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

// Load environment variables
dotenv.config();

async function fixSchoolPasswords() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('✅ Connected to database\n');

    // Find all users with plain text school passwords
    // (passwords that don't start with $2a$ or $2b$ which are bcrypt hashes)
    const users = await User.find({ 
      schoolPassword: { 
        $exists: true, 
        $ne: '',
        $not: /^\$2[ab]\$/ // Find passwords that DON'T start with bcrypt hash pattern
      }
    });

    console.log(`📊 Found ${users.length} users with plain text school passwords\n`);

    if (users.length === 0) {
      console.log('✅ All school passwords are already hashed!');
      await mongoose.connection.close();
      return;
    }

    let updated = 0;
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

    for (const user of users) {
      const plainPassword = user.schoolPassword;
      console.log(`🔄 Hashing password for: ${user.name} (${user.email})`);
      console.log(`   School: ${user.schoolName}, City: ${user.city}`);
      console.log(`   Plain password: ${plainPassword}`);
      
      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
      
      // Update user
      user.schoolPassword = hashedPassword;
      await user.save();
      
      console.log(`   ✅ Hashed password: ${hashedPassword}\n`);
      updated++;
    }

    console.log(`\n✅ Successfully hashed ${updated} school passwords`);
    
    // Verify the fix
    console.log('\n--- Verification ---');
    const testUser = await User.findOne({ email: 'smriti.soni@student.com' }).select('+schoolPassword');
    if (testUser && testUser.schoolPassword) {
      const testPassword = '103PVQ5O';
      const isMatch = await bcrypt.compare(testPassword, testUser.schoolPassword);
      console.log(`Testing ${testUser.email} with password "${testPassword}":`, isMatch ? '✅ WORKS' : '❌ FAILED');
    }

    await mongoose.connection.close();
    console.log('\n✅ Fix complete - users can now login with school password!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSchoolPasswords();
