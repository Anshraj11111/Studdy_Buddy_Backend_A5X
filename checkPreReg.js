import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('🔍 Searching for Lakshya in PreRegisteredStudents...\n');
    
    const preReg = await PreRegisteredStudent.findOne({ 
      email: 'lakshya.tiwari@student.com' 
    });
    
    if (!preReg) {
      console.log('❌ No PreReg entry found!');
      console.log('\nThis is why school password login fails!');
      console.log('Lakshya needs a PreRegisteredStudent entry.\n');
    } else {
      console.log('✅ PreReg Entry Found!\n');
      console.log('📋 Details:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Name:', preReg.name);
      console.log('Email:', preReg.email);
      console.log('School Name:', preReg.schoolName);
      console.log('School Password:', preReg.schoolPassword);
      console.log('City:', preReg.city);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
