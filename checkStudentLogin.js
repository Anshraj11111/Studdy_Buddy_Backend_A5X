/**
 * Debug Script: Check Student Login Issue
 * 
 * Checks why a student can't login with school password
 * 
 * Usage: node checkStudentLogin.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function checkStudentLogin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const dbUri = process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB\n');

    const User = (await import('./src/models/User.js')).default;

    const email = 'rishika.rani@student.com';
    const providedPassword = ''; // She left it blank
    const providedSchoolPassword = 'IYP8V2LF';

    console.log('📋 Searching for student...');
    console.log(`   Email: ${email}`);
    console.log(`   Provided Password: "${providedPassword}" (blank)`);
    console.log(`   Provided School Password: "${providedSchoolPassword}"\n`);

    // Find user
    const user = await User.findOne({ email }).lean();

    if (!user) {
      console.log('❌ User not found with this email!');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   School Name: ${user.schoolName || 'Not set'}`);
    console.log(`   School Password (stored): "${user.schoolPassword || 'Not set'}"`);
    console.log(`   City: ${user.city || 'Not set'}\n`);

    // Check if personal password would work
    console.log('📋 Testing Personal Password Authentication:');
    if (providedPassword) {
      const isPersonalPasswordValid = await bcrypt.compare(providedPassword, user.password);
      console.log(`   Personal password match: ${isPersonalPasswordValid ? '✅ YES' : '❌ NO'}\n`);
    } else {
      console.log('   ⏭️ Skipped (no password provided)\n');
    }

    // Check if school password would work
    console.log('📋 Testing School Password Authentication:');
    if (providedSchoolPassword && user.schoolPassword) {
      const isSchoolPasswordMatch = user.schoolPassword === providedSchoolPassword;
      console.log(`   Stored: "${user.schoolPassword}"`);
      console.log(`   Provided: "${providedSchoolPassword}"`);
      console.log(`   Match: ${isSchoolPasswordMatch ? '✅ YES' : '❌ NO'}\n`);

      if (!isSchoolPasswordMatch) {
        console.log('🔍 Checking for case sensitivity or whitespace issues:');
        console.log(`   Stored (trimmed, uppercase): "${user.schoolPassword.trim().toUpperCase()}"`);
        console.log(`   Provided (trimmed, uppercase): "${providedSchoolPassword.trim().toUpperCase()}"`);
        console.log(`   Match (case-insensitive): ${user.schoolPassword.trim().toUpperCase() === providedSchoolPassword.trim().toUpperCase() ? '✅ YES' : '❌ NO'}\n`);
      }
    } else {
      console.log(`   ❌ Cannot test: ${!providedSchoolPassword ? 'No school password provided' : 'User has no school password stored'}\n`);
    }

    // Authentication decision
    console.log('🔐 Authentication Decision:');
    let canLogin = false;
    let reason = '';

    if (providedPassword) {
      const isPasswordValid = await bcrypt.compare(providedPassword, user.password);
      if (isPasswordValid) {
        canLogin = true;
        reason = 'Personal password is correct';
      }
    }

    if (!canLogin && providedSchoolPassword && user.schoolPassword) {
      if (user.schoolPassword === providedSchoolPassword) {
        canLogin = true;
        reason = 'School password is correct';
      } else {
        reason = 'School password does not match stored value';
      }
    }

    if (!canLogin && !providedPassword && !providedSchoolPassword) {
      reason = 'No password provided (either personal or school password required)';
    }

    if (!canLogin && !user.schoolPassword && !providedPassword) {
      reason = 'User has no school password, personal password required';
    }

    console.log(`   Can Login: ${canLogin ? '✅ YES' : '❌ NO'}`);
    console.log(`   Reason: ${reason}\n`);

    // Solution
    if (!canLogin) {
      console.log('💡 Solution:');
      if (!user.schoolPassword) {
        console.log('   1. User has no school password stored in database');
        console.log('   2. User must use personal password to login');
        console.log('   3. Or admin needs to set school password for this user');
      } else if (user.schoolPassword !== providedSchoolPassword) {
        console.log(`   1. Stored school password: "${user.schoolPassword}"`);
        console.log(`   2. Provided school password: "${providedSchoolPassword}"`);
        console.log('   3. They do not match - check for typos');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkStudentLogin();
