import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PreRegisteredStudent from './src/models/PreRegisteredStudent.js';

dotenv.config();

async function setPragyanPlain() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    const pragyan = await PreRegisteredStudent.findOne({ 
      email: { $regex: new RegExp(`^pragyan\\.soni@student\\.com$`, 'i') }
    });

    if (pragyan) {
      // Set the plain password that you gave to Pragyan
      // Replace 'CURRENT_PASSWORD' with actual password you gave
      const currentPassword = 'E028RBPE'; // Change this if different
      
      pragyan.schoolPasswordPlain = currentPassword;
      await pragyan.save();
      
      console.log('✅ Pragyan Soni updated:');
      console.log('   schoolPasswordPlain:', pragyan.schoolPasswordPlain);
      console.log('\n✅ Now Pragyan will be SKIPPED in bulk update!');
    } else {
      console.log('❌ Pragyan Soni not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setPragyanPlain();
