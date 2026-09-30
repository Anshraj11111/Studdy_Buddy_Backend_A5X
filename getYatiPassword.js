import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const email = 'yati.sharma@student.com';

async function getPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Find Yati Sharma
    const student = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (student) {
      console.log('📋 Student Details:');
      console.log('═'.repeat(60));
      console.log(`Name: ${student.name || 'N/A'}`);
      console.log(`Email: ${student.email}`);
      console.log(`School Name: ${student.schoolName}`);
      console.log(`Phone: ${student.phone || 'N/A'}`);
      console.log(`Is Used: ${student.isUsed}`);
      console.log('═'.repeat(60));
      console.log('\n🔑 SCHOOL PASSWORD (Plain Text):');
      console.log('═'.repeat(60));
      
      if (student.schoolPasswordPlain && student.schoolPasswordPlain !== '') {
        console.log(`\n   ${student.schoolPasswordPlain}\n`);
      } else {
        console.log('\n   ⚠️  Plain text password not available');
        console.log('   Hashed password: ' + student.schoolPassword.substring(0, 30) + '...\n');
        console.log('   Note: Password was hashed before schoolPasswordPlain field was added.');
        console.log('   Admin needs to update the password in admin panel to set new password.\n');
      }
      
      console.log('═'.repeat(60));
    } else {
      console.log('❌ Student not found with email:', email);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getPassword();
