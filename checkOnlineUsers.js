import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    // Check users active in last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const totalUsers = await User.countDocuments();
    const activeToday = await User.countDocuments({ updatedAt: { $gte: oneDayAgo } });
    
    console.log('📊 Platform Stats:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Total users: ${totalUsers}`);
    console.log(`📅 Active today (last 24h): ${activeToday}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  })
  .catch(err => { console.error(err.message); process.exit(1); });
