/**
 * Test Push Notification to Mentor
 * Sends a test notification to all mentors
 */

import mongoose from 'mongoose';
import webpush from 'web-push';
import 'dotenv/config';

async function testPushNotification() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // Import models
    const User = (await import('./src/models/User.js')).default;
    const PushSubscription = (await import('./src/models/PushSubscription.js')).default;

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    console.log('📋 Finding mentors...');
    const mentors = await User.find({ role: 'mentor' }).select('name email').lean();
    console.log(`✅ Found ${mentors.length} mentors\n`);

    if (mentors.length === 0) {
      console.log('❌ No mentors found!');
      process.exit(1);
    }

    // Get push subscriptions for mentors
    const mentorIds = mentors.map(m => m._id);
    const subscriptions = await PushSubscription.find({
      user: { $in: mentorIds } // Changed from userId to user
    }).lean();

    console.log(`📱 Found ${subscriptions.length} push subscriptions\n`);

    if (subscriptions.length === 0) {
      console.log('❌ No push subscriptions found!');
      console.log('💡 Make sure mentors have enabled notifications in browser\n');
      
      console.log('Available mentors:');
      mentors.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.name} (${m.email})`);
      });
      
      process.exit(1);
    }

    // Send test notification to each subscription
    const payload = JSON.stringify({
      title: '🔔 Test Notification',
      body: 'This is a test push notification from Studdy Buddy!',
      icon: '/studdybuddy-logo.png',
      badge: '/studdybuddy-logo.png',
      data: {
        url: '/mentor-dashboard',
        type: 'test'
      }
    });

    console.log('📤 Sending test notifications...\n');

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      const mentor = mentors.find(m => m._id.toString() === sub.user.toString()); // Changed from sub.userId
      
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth
            }
          },
          payload
        );
        
        console.log(`   ✅ Sent to: ${mentor?.name || 'Unknown'} (${mentor?.email || 'N/A'})`);
        successCount++;
      } catch (err) {
        console.log(`   ❌ Failed for: ${mentor?.name || 'Unknown'}`);
        console.log(`      Error: ${err.message}`);
        
        // If subscription is invalid (410 Gone), remove it
        if (err.statusCode === 410) {
          console.log(`      🗑️ Removing invalid subscription`);
          await PushSubscription.deleteOne({ _id: sub._id });
        }
        
        failCount++;
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('📊 SUMMARY:');
    console.log(`   ✅ Successfully sent: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📱 Total subscriptions: ${subscriptions.length}`);
    console.log('═'.repeat(70));

    if (successCount > 0) {
      console.log('\n✅ Test notifications sent! Check your browser/device.');
    } else {
      console.log('\n❌ No notifications were sent successfully.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testPushNotification();
