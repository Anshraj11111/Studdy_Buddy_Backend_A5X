import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function linkPreReg() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Find user with yatisharma@student.com
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^yatisharma@student.com$`, 'i') }
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ Found User:', user.name, '(' + user.email + ')');

    // Find PreReg with yati.sharma@student.com
    const preReg = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^yati\\.sharma@student\\.com$`, 'i') }
    });

    if (!preReg) {
      console.log('❌ PreReg entry not found');
      process.exit(1);
    }

    console.log('✅ Found PreReg:', preReg.email);
    console.log('   School Password Plain:', preReg.schoolPasswordPlain);

    // Update PreReg email to match user email
    const oldEmail = preReg.email;
    preReg.email = user.email; // Change to yatisharma@student.com
    preReg.isUsed = true;
    preReg.usedAt = new Date();
    await preReg.save();

    console.log('\n✅ PreReg entry updated:');
    console.log('   Old email:', oldEmail);
    console.log('   New email:', preReg.email);
    console.log('   Marked as USED');

    // Update user with school password info
    user.schoolPassword = preReg.schoolPassword;
    user.schoolPasswordPlain = preReg.schoolPasswordPlain;
    await user.save();

    console.log('\n✅ User updated with school password');
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 YATI SHARMA CAN NOW LOGIN WITH:');
    console.log('═'.repeat(60));
    console.log('Email:', user.email);
    console.log('Personal Password: (The password used during signup)');
    console.log('School Password:', preReg.schoolPasswordPlain);
    console.log('═'.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

linkPreReg();
