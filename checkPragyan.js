import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function checkPragyan() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    const pragyan = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^pragyan\\.soni@student\\.com$`, 'i') }
    });

    if (pragyan) {
      console.log('📋 PRAGYAN SONI Status:');
      console.log('═'.repeat(60));
      console.log('Name:', pragyan.name);
      console.log('Email:', pragyan.email);
      console.log('School:', pragyan.schoolName);
      console.log('Is Used:', pragyan.isUsed);
      console.log('schoolPasswordPlain:', pragyan.schoolPasswordPlain || '(empty)');
      console.log('Has Plain Password:', !!(pragyan.schoolPasswordPlain && pragyan.schoolPasswordPlain !== ''));
      console.log('═'.repeat(60));
      
      if (pragyan.schoolPasswordPlain && pragyan.schoolPasswordPlain !== '') {
        console.log('\n✅ Pragyan Soni has plain password - WILL BE SKIPPED in update');
      } else {
        console.log('\n⚠️  Pragyan Soni has NO plain password - WILL BE UPDATED from file');
      }
    } else {
      console.log('❌ Pragyan Soni not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPragyan();
