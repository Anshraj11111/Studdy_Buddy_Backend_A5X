import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('🔧 Fixing Lakshya PreReg entry...\n');
    
    const preReg = await PreRegisteredStudent.findOne({ 
      email: 'lakshya.tiwari@student.com' 
    });
    
    if (!preReg) {
      console.log('❌ PreReg entry not found!');
      process.exit(1);
    }
    
    console.log('📋 Current Data:');
    console.log('School Name:', preReg.schoolName);
    console.log('School Password:', preReg.schoolPassword);
    console.log('City:', preReg.city);
    
    // Set plain text password (NO HASHING)
    const correctPassword = '0Y7Z5NZV';
    
    console.log('\n🔐 Setting Plain Text Password:', correctPassword);
    
    // Update PreReg entry with PLAIN TEXT password
    preReg.schoolPassword = correctPassword; // Plain text, NOT hashed
    preReg.city = 'Katni'; // Also fix city
    
    await preReg.save();
    
    console.log('\n✅ PreReg Entry Updated!');
    console.log('School Name:', preReg.schoolName);
    console.log('School Password:', preReg.schoolPassword);
    console.log('City:', preReg.city);
    
    console.log('\n✅ Password is now stored as PLAIN TEXT');
    console.log('✅ Lakshya can now login with: 0Y7Z5NZV');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
