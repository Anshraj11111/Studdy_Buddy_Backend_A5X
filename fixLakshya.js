import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('🔧 Fixing Lakshya Tiwari data...\n');
    
    const user = await User.findOne({ email: 'lakshya.tiwari@student.com' });
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('📋 Current Data:');
    console.log('School Name:', user.schoolName);
    console.log('School Password:', user.schoolPassword);
    console.log('School Password Plain:', user.schoolPasswordPlain);
    
    // Update school name
    user.schoolName = 'Bardsley';
    
    // Set both hashed and plain school password
    user.schoolPassword = '0Y7Z5NZV'; // This will be hashed by pre-save hook if needed
    user.schoolPasswordPlain = '0Y7Z5NZV'; // Store plain for reference
    
    await user.save();
    
    console.log('\n✅ Updated Data:');
    console.log('School Name:', user.schoolName);
    console.log('School Password:', user.schoolPassword);
    console.log('School Password Plain:', user.schoolPasswordPlain);
    console.log('\n✅ Lakshya Tiwari fixed successfully!');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
