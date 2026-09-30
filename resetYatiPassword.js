import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const email = 'yati.sharma@student.com';
const newPassword = 'GATMOILS'; // From screenshot - this looks like the intended password

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Find Yati Sharma
    const student = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (student) {
      console.log('📋 Found Student: Yati Sharma');
      console.log('Current Status:', student.isUsed ? 'USED' : 'PENDING');
      
      // Set new password (both hashed and plain)
      student.schoolPassword = await bcrypt.hash(newPassword, 10);
      student.schoolPasswordPlain = newPassword;
      await student.save();
      
      console.log('\n✅ Password Updated Successfully!');
      console.log('═'.repeat(60));
      console.log(`New School Password: ${newPassword}`);
      console.log('═'.repeat(60));
      console.log('\n📢 Tell Yati Sharma to use this password for signup/login.\n');
    } else {
      console.log('❌ Student not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
