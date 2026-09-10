/**
 * Test Script: Push Notification to Mentors
 * 
 * This script sends a test push notification to all mentors
 * who have subscribed to push notifications.
 * 
 * Usage: node testPushNotification.js
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function testPushNotification() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const dbUri = process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB\n');

    // Import models and services
    const User = (await import('./src/models/User.js')).default;
    const PushSubscription = (await import('./src/models/PushSubscription.js')).default;
    const { sendPushToUser } = await import('./src/services/webPush.service.js');

    // 1. Find all mentors
    console.log('📋 Step 1: Finding mentors...');
    const mentors = await User.find({ role: 'mentor' }).select('_id name email').lean();
    console.log(`✅ Found ${mentors.length} mentors\n`);

    if (mentors.length === 0) {
      console.log('❌ No mentors found!');
      process.exit(1);
    }

    // 2. Check which mentors have push subscriptions
    console.log('📋 Step 2: Checking push subscriptions...');
    for (const mentor of mentors) {
      const subs = await PushSubscription.countDocuments({ user: mentor._id });
      console.log(`   ${mentor.name}: ${subs} device(s) subscribed`);
    }

    // 3. Send test push notification to all mentors
    console.log('\n📋 Step 3: Sending test push notifications...');
    const pushPromises = mentors.map(mentor =>
      sendPushToUser(mentor._id.toString(), {
        title: '🆘 Test: New Doubt Posted',
        body: 'This is a test notification to verify push notifications are working correctly.',
        icon: '/icons/icon-192x192.png',
        url: '/doubts',
        type: 'doubt',
      })
    );

    await Promise.allSettled(pushPromises);
    console.log('✅ Push notifications sent!\n');

    console.log('📱 Next Steps:');
    console.log('   1. Check your phone/browser for push notification');
    console.log('   2. Click the notification to open /doubts page');
    console.log('   3. If you don\'t receive it, make sure:');
    console.log('      - You\'re logged in as a mentor');
    console.log('      - You allowed notifications when prompted');
    console.log('      - Your browser/device supports push notifications');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testPushNotification();
