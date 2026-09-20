/**
 * Test LAKSHYA TIWARI login with school password
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

dotenv.config();

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'lakshya.tiwari@student.com';
    const schoolPasswordInput = 'OY7Z5NZV'; // The password user is trying

    console.log('🔍 Finding user:', email);
    const user = await User.findOne({ email }).select('+schoolPassword');

    if (!user) {
      console.log('❌ User not found!');
      await mongoose.connection.close();
      return;
    }

    console.log('✅ User found:', user.name);
    console.log('📧 Email:', user.email);
    console.log('🏫 School:', user.schoolName);
    console.log('🔑 Stored password (hashed):', user.schoolPassword.substring(0, 20) + '...');
    console.log('🔑 Input password:', schoolPasswordInput);
    console.log();

    // Test bcrypt comparison
    const isMatch = await bcrypt.compare(schoolPasswordInput, user.schoolPassword);
    
    if (isMatch) {
      console.log('✅ ✅ ✅ PASSWORD MATCHES! User can login successfully!');
    } else {
      console.log('❌ ❌ ❌ PASSWORD DOES NOT MATCH! Login will fail!');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

testLogin();
