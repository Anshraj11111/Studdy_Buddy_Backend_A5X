import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import LectureProgress from './src/models/LectureProgress.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔍 Checking Pragyan Soni progress...\n');
    
    const user = await User.findOne({ name: /pragyan.*soni/i });
    
    if (!user) {
      console.log('❌ Pragyan Soni not found!');
      process.exit(1);
    }
    
    console.log(`✅ Found: ${user.name} (${user.email})`);
    console.log(`XP: ${user.xp}\n`);
    
    const progress = await LectureProgress.find({ userId: user._id })
      .populate('lectureId', 'title')
      .sort({ updatedAt: -1 });
    
    console.log(`📊 Total lecture progress records: ${progress.length}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    progress.forEach((p, i) => {
      console.log(`${i + 1}. ${p.lectureId?.title || 'Unknown Lecture'}`);
      console.log(`   Watched: ${p.watchedPercentage}%`);
      console.log(`   Completed: ${p.isCompleted ? '✅ YES' : '❌ NO'}`);
      console.log(`   Last watched: ${p.updatedAt}`);
      console.log();
    });
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
