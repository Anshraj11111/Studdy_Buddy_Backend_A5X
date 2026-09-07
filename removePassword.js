import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function removePassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studdy-buddy');
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Remove school password
    const result = await User.updateOne(
      { email: 'adityamishraa2509@gmail.com' },
      { $set: { schoolPassword: '' } }
    );

    console.log('✅ Updated:', result.modifiedCount, 'user(s)');

    // Verify
    const user = await User.findOne({ email: 'adityamishraa2509@gmail.com' }).lean();
    console.log('School Name:', user.schoolName);
    console.log('School Password:', user.schoolPassword === '' ? '(REMOVED)' : user.schoolPassword);
    console.log('isPremium:', user.isPremium || false);

    await mongoose.disconnect();
    console.log('✅ Done!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

removePassword();
