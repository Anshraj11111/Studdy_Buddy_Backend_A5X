/**
 * Test if admin can see plain passwords
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();

async function testAdminView() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get LAKSHYA TIWARI's data (as admin would see)
    const user = await User.findOne({ email: 'lakshya.tiwari@student.com' })
      .select('-password +schoolPasswordPlain')
      .lean();

    console.log('📋 User Data (Admin View):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('School:', user.schoolName);
    console.log('City:', user.city);
    console.log();
    console.log('🔐 School Password (Hashed - for login):');
    console.log('   ', user.schoolPassword);
    console.log();
    console.log('📝 School Password (Plain - admin can see):');
    console.log('   ', user.schoolPasswordPlain || '❌ NOT SET');
    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (user.schoolPasswordPlain) {
      console.log('✅ SUCCESS! Admin can see plain password:', user.schoolPasswordPlain);
      console.log('✅ Student can login with this password!');
      console.log('✅ Admin can share this password with student if they forget!');
    } else {
      console.log('❌ Plain password NOT found');
      console.log('💡 Run: node populatePlainPasswords.js');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

testAdminView();
