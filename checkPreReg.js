import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const email = 'pragyan.soni@student.com';

async function checkPreReg() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB');

    // Check if student is pre-registered
    const preReg = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
    });

    if (preReg) {
      console.log('✅ Found PreReg entry:');
      console.log('  Email:', preReg.email);
      console.log('  School Name:', preReg.schoolName);
      console.log('  School Password (hashed):', preReg.schoolPassword);
      console.log('  Is Used:', preReg.isUsed);
      console.log('  Phone:', preReg.phoneNumber);
    } else {
      console.log('❌ No PreReg entry found for:', email);
      console.log('\n📝 This student needs to be added to PreRegisteredStudent collection first.');
      console.log('Or they can signup without school code for freemium access.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPreReg();
