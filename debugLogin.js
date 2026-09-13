import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

// Load environment variables
dotenv.config();

async function debugLogin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('✅ Connected to database\n');

    const email = 'smriti.soni@student.com';
    
    // Find user
    const user = await User.findOne({ email }).select('+password +schoolPassword');
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      return;
    }

    console.log('📧 User found:', email);
    console.log('👤 Name:', user.name);
    console.log('🏫 School:', user.schoolName);
    console.log('🌆 City:', user.city);
    console.log('🔑 Role:', user.role);
    console.log('\n--- Password Analysis ---');
    console.log('Personal Password (hashed):', user.password ? 'EXISTS' : 'NOT SET');
    console.log('School Password (hashed):', user.schoolPassword ? 'EXISTS' : 'NOT SET');
    
    if (user.password) {
      console.log('Personal Password Hash:', user.password);
    }
    
    if (user.schoolPassword) {
      console.log('School Password Hash:', user.schoolPassword);
      
      // Test school password
      const testSchoolPassword = '103PVQ5O';
      console.log('\n--- Testing School Password ---');
      console.log('Testing password:', testSchoolPassword);
      
      const isMatch = await bcrypt.compare(testSchoolPassword, user.schoolPassword);
      console.log('Does it match?', isMatch ? '✅ YES' : '❌ NO');
      
      // Also try comparing with plain text (in case it wasn't hashed)
      if (user.schoolPassword === testSchoolPassword) {
        console.log('⚠️ WARNING: School password is stored in PLAIN TEXT!');
      }
    }

    console.log('\n--- Authentication Flow Debug ---');
    console.log('1. User can login with:');
    if (user.password) {
      console.log('   ✅ Personal password');
    }
    if (user.schoolPassword) {
      console.log('   ✅ School password');
    }
    
    console.log('\n2. Expected behavior:');
    console.log('   - If personal password provided: Check against user.password');
    console.log('   - If school password provided: Check against user.schoolPassword');
    console.log('   - Both are bcrypt hashed and should use bcrypt.compare()');

    await mongoose.connection.close();
    console.log('\n✅ Debug complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugLogin();
