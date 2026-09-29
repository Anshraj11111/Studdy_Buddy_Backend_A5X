import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const email = 'lakshya.tiwari@student.com';
const correctPassword = 'OY7Z5NZV';

async function fixPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    console.log('✅ Found user:', user.name);

    // Find PreReg entry
    const preReg = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (preReg) {
      console.log('✅ Found PreReg entry');
      console.log('Current schoolPassword (hashed):', preReg.schoolPassword);
      
      // Hash the correct password
      const hashedPassword = await bcrypt.hash(correctPassword, 10);
      console.log('New hashed password:', hashedPassword);
      
      // Update PreReg
      preReg.schoolPassword = hashedPassword;
      await preReg.save();
      console.log('✅ PreReg password updated');
    } else {
      console.log('⚠️ No PreReg entry found');
    }

    // Also update user's school password (legacy support)
    if (user.schoolPassword) {
      console.log('Current user schoolPassword (hashed):', user.schoolPassword);
      const hashedPassword = await bcrypt.hash(correctPassword, 10);
      user.schoolPassword = hashedPassword;
      await user.save();
      console.log('✅ User password updated');
    }

    console.log('\n✅ Password fix completed!');
    console.log('Try logging in with:');
    console.log('Email:', email);
    console.log('School Password:', correctPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPassword();
