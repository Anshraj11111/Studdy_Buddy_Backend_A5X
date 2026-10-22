import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import { sendPushToUser } from './src/services/webPush.service.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔔 Testing push notification to ALL mentors...\n');
    
    const mentors = await User.find({ role: 'mentor' }).select('_id name email');
    console.log(`📊 Found ${mentors.length} mentors\n`);
    
    for (const mentor of mentors) {
      console.log(`📤 Sending to: ${mentor.name} (${mentor.email})`);
      try {
        await sendPushToUser(mentor._id.toString(), {
          url: '/doubts',
          title: '🧪 Test - New Doubt Posted',
          body: 'Test notification - checking if push works for all mentors',
          type: 'doubt',
        });
        console.log(`   ✅ Sent successfully`);
      } catch (err) {
        console.log(`   ❌ Failed: ${err.message}`);
      }
    }
    
    console.log('\n✅ Done! Check all mentors phones/browsers.');
    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
