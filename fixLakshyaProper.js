import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔧 Fixing Lakshya with proper bcrypt hash...\n');
    
    const preReg = await PreRegisteredStudent.findOne({ email: 'lakshya.tiwari@student.com' });
    
    if (!preReg) {
      console.log('❌ Not found!');
      process.exit(1);
    }

    console.log('Current password:', preReg.schoolPassword);
    
    // Create proper bcrypt hash of 0Y7Z5NZV
    const correctPassword = '0Y7Z5NZV';
    const newHash = await bcrypt.hash(correctPassword, 10);
    
    preReg.schoolPassword = newHash;
    preReg.schoolPasswordPlain = correctPassword; // store plain for admin reference
    await preReg.save();
    
    // Verify it works
    const test = await bcrypt.compare(correctPassword, newHash);
    console.log('✅ New hash created:', newHash.substring(0, 30) + '...');
    console.log('✅ Verification test:', test ? 'PASS' : 'FAIL');
    console.log('\n✅ Lakshya can now login with school password: 0Y7Z5NZV');
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
