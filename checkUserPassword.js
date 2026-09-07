import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function checkUser() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGO_URI_PRIMARY;
    if (!uri) {
      console.error('❌ MONGO_URI not found in .env');
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: 'surya@gmail.com' }).lean();
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n=== User Details ===');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('School Name:', user.schoolName);
    console.log('School Password:', JSON.stringify(user.schoolPassword)); // JSON.stringify shows empty string as ""
    console.log('City:', user.city);
    console.log('\n=== Access Check ===');
    const hasFreeAccess = !!(user.schoolName && user.schoolPassword) || user.isPremium;
    console.log('hasFreeAccess:', hasFreeAccess);
    console.log('Logic: !!(schoolName && schoolPassword) || isPremium');
    console.log('Breakdown:', {
      schoolName: user.schoolName,
      schoolPassword: user.schoolPassword,
      'schoolName && schoolPassword': !!(user.schoolName && user.schoolPassword),
      isPremium: user.isPremium,
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
