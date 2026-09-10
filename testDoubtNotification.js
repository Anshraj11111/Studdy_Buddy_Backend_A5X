/**
 * Test Script: Doubt Notification to Mentors
 * 
 * This script simulates a student posting a doubt and verifies that
 * all mentors receive notifications.
 * 
 * Usage: node testDoubtNotification.js
 */

import mongoose from 'mongoose';
import 'dotenv/config';

async function testDoubtNotification() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    // Use primary database for users
    const dbUri = process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const User = (await import('./src/models/User.js')).default;
    const Notification = (await import('./src/models/Notification.js')).default;

    // 1. Check how many mentors exist
    console.log('📋 Step 1: Checking mentors in database...');
    const mentors = await User.find({ role: 'mentor' }).select('_id name email').lean();
    console.log(`✅ Found ${mentors.length} mentors:`);
    mentors.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.name} (${m.email})`);
    });

    if (mentors.length === 0) {
      console.log('\n❌ No mentors found! Please create at least one mentor account first.');
      console.log('   You can create a mentor using the signup page with mentor code.');
      process.exit(1);
    }

    // 2. Find a student to simulate doubt posting
    console.log('\n📋 Step 2: Finding a student account...');
    const student = await User.findOne({ role: 'student' }).select('_id name email').lean();
    
    if (!student) {
      console.log('❌ No student found! Please create a student account first.');
      process.exit(1);
    }
    
    console.log(`✅ Using student: ${student.name} (${student.email})`);

    // 3. Create test notifications (simulating what happens when doubt is posted)
    console.log('\n📋 Step 3: Creating test notifications for all mentors...');
    const testDoubtTitle = 'Test Doubt: How does async/await work in JavaScript?';
    
    const notifications = mentors.map(mentor => ({
      recipient: mentor._id,
      sender: student._id,
      type: 'doubt',
      doubtId: new mongoose.Types.ObjectId(), // Mock doubt ID
      message: `New doubt posted: "${testDoubtTitle.length > 50 ? testDoubtTitle.substring(0, 50) + '...' : testDoubtTitle}"`,
      read: false,
    }));

    await Notification.insertMany(notifications);
    console.log(`✅ Created ${notifications.length} notifications`);

    // 4. Verify notifications were created
    console.log('\n📋 Step 4: Verifying notifications...');
    for (const mentor of mentors) {
      const notifCount = await Notification.countDocuments({
        recipient: mentor._id,
        type: 'doubt',
        read: false,
      });
      console.log(`   ✅ ${mentor.name}: ${notifCount} unread doubt notification(s)`);
    }

    // 5. Show sample notification data
    console.log('\n📋 Step 5: Sample notification data:');
    const sampleNotif = await Notification.findOne({ type: 'doubt' })
      .populate('sender', 'name email profileImage')
      .populate('recipient', 'name email')
      .lean();
    
    if (sampleNotif) {
      console.log(JSON.stringify({
        type: sampleNotif.type,
        message: sampleNotif.message,
        sender: {
          name: sampleNotif.sender.name,
          email: sampleNotif.sender.email,
        },
        recipient: {
          name: sampleNotif.recipient.name,
          email: sampleNotif.recipient.email,
        },
        read: sampleNotif.read,
        createdAt: sampleNotif.createdAt,
      }, null, 2));
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📱 Next Steps:');
    console.log('   1. Login as a mentor in the browser');
    console.log('   2. Check the notification bell icon (should show a red badge)');
    console.log('   3. Click the bell to see the doubt notification');
    console.log('   4. Click the notification to navigate to /doubts page');
    console.log('\n🧹 Cleanup: Run node cleanupTestNotifications.js to remove test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testDoubtNotification();
