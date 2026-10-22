import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import PushSubscription from './src/models/PushSubscription.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔍 Checking mentor push subscriptions...\n');
    
    const mentors = await User.find({ role: 'mentor' }).select('_id name email');
    console.log(`📊 Total mentors: ${mentors.length}\n`);
    
    for (const mentor of mentors) {
      const subs = await PushSubscription.find({ user: mentor._id });
      console.log(`👤 ${mentor.name} (${mentor.email})`);
      console.log(`   Push subscriptions: ${subs.length}`);
      if (subs.length > 0) {
        subs.forEach((s, i) => {
          console.log(`   Sub ${i+1}: ${s.endpoint.substring(0, 60)}...`);
          console.log(`   Created: ${s.createdAt}`);
        });
      } else {
        console.log(`   ❌ NO PUSH SUBSCRIPTIONS - Notifications will not work!`);
      }
      console.log();
    }
    
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
