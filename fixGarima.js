import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔧 Fixing Garima Diwan account...\n');
    
    const user = await User.findOne({ email: 'garima.diwan@student.com' });
    if (!user) { console.log('❌ User not found!'); process.exit(1); }
    
    // Get PreReg to get school password
    const preReg = await PreRegisteredStudent.findOne({ email: 'garima.diwan@student.com' });
    if (!preReg) { console.log('❌ PreReg not found!'); process.exit(1); }
    
    console.log('PreReg school password:', preReg.schoolPassword);
    
    // Fix user account
    user.schoolName = 'Bardsley';
    user.schoolPassword = preReg.schoolPassword; // Copy from PreReg
    user.hasFreeAccess = true; // Give free access
    
    await user.save();
    
    console.log('\n✅ Garima account fixed!');
    console.log('School:', user.schoolName);
    console.log('hasFreeAccess:', user.hasFreeAccess);
    console.log('schoolPassword set:', user.schoolPassword ? 'YES' : 'NO');
    console.log('\n✅ Garima can now access courses for free!');
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
