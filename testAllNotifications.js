import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import PushSubscription from './src/models/PushSubscription.js';
import { sendPushToUser } from './src/services/webPush.service.js';

dotenv.config();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🧪 COMPREHENSIVE NOTIFICATION TEST\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ── TEST 1: All Mentors ──────────────────────────────
    console.log('\n📋 TEST 1: New Doubt → All Mentors');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const mentors = await User.find({ role: 'mentor' }).select('_id name email');
    let mentorSuccess = 0, mentorFail = 0;

    for (const mentor of mentors) {
      const subs = await PushSubscription.find({ user: mentor._id });
      if (!subs.length) {
        console.log(`  ⚠️  ${mentor.name} — NO SUBSCRIPTION`);
        mentorFail++;
        continue;
      }
      try {
        await sendPushToUser(mentor._id.toString(), {
          url: '/doubts',
          title: '🆘 New Doubt Posted',
          body: `Test: A student asked about Robotics motors`,
          type: 'doubt',
        });
        console.log(`  ✅ ${mentor.name} — SENT (${subs.length} device(s))`);
        mentorSuccess++;
      } catch (err) {
        console.log(`  ❌ ${mentor.name} — FAILED: ${err.message}`);
        mentorFail++;
      }
    }
    console.log(`\n  Result: ${mentorSuccess} success, ${mentorFail} failed out of ${mentors.length} mentors`);

    await delay(2000);

    // ── TEST 2: Student Reply Notification ───────────────
    console.log('\n📋 TEST 2: Doubt Reply → Student');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const students = await User.find({ role: 'student' }).limit(3).select('_id name email');
    let studentSuccess = 0, studentFail = 0;

    for (const student of students) {
      const subs = await PushSubscription.find({ user: student._id });
      if (!subs.length) {
        console.log(`  ⚠️  ${student.name} — NO SUBSCRIPTION`);
        studentFail++;
        continue;
      }
      try {
        await sendPushToUser(student._id.toString(), {
          url: '/doubts',
          title: '💬 New Reply to Your Doubt',
          body: `Test: Mentor replied to your question`,
          type: 'doubt_reply',
        });
        console.log(`  ✅ ${student.name} — SENT (${subs.length} device(s))`);
        studentSuccess++;
      } catch (err) {
        console.log(`  ❌ ${student.name} — FAILED: ${err.message}`);
        studentFail++;
      }
    }
    console.log(`\n  Result: ${studentSuccess} success, ${studentFail} failed out of ${students.length} students tested`);

    await delay(2000);

    // ── TEST 3: Community Post Notification ──────────────
    console.log('\n📋 TEST 3: Community Post → All Users (sample 3)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const users = await User.find({}).limit(3).select('_id name role');
    let communitySuccess = 0, communityFail = 0;

    for (const user of users) {
      const subs = await PushSubscription.find({ user: user._id });
      if (!subs.length) {
        console.log(`  ⚠️  ${user.name} (${user.role}) — NO SUBSCRIPTION`);
        communityFail++;
        continue;
      }
      try {
        await sendPushToUser(user._id.toString(), {
          url: '/communities',
          title: '🌐 New Community Post',
          body: `Test: Someone shared a new Robotics project`,
          type: 'community',
        });
        console.log(`  ✅ ${user.name} (${user.role}) — SENT`);
        communitySuccess++;
      } catch (err) {
        console.log(`  ❌ ${user.name} — FAILED: ${err.message}`);
        communityFail++;
      }
    }
    console.log(`\n  Result: ${communitySuccess} success, ${communityFail} failed`);

    await delay(2000);

    // ── TEST 4: Subscription Health Check ────────────────
    console.log('\n📋 TEST 4: Subscription Health Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const totalUsers = await User.countDocuments();
    const totalSubs = await PushSubscription.countDocuments();
    const usersWithSubs = await PushSubscription.distinct('user');

    console.log(`  Total users: ${totalUsers}`);
    console.log(`  Total push subscriptions: ${totalSubs}`);
    console.log(`  Users with subscriptions: ${usersWithSubs.length}`);
    console.log(`  Coverage: ${((usersWithSubs.length / totalUsers) * 100).toFixed(1)}%`);

    // Check stale subs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const staleSubs = await PushSubscription.countDocuments({ createdAt: { $lt: thirtyDaysAgo } });
    console.log(`  Potentially stale subs (>30 days): ${staleSubs}`);

    // ── FINAL SUMMARY ────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏆 FINAL SUMMARY:');
    console.log(`  ✅ Mentor notifications: ${mentorSuccess}/${mentors.length} working`);
    console.log(`  ✅ Student notifications: ${studentSuccess}/${students.length} tested working`);
    console.log(`  ✅ Community notifications: ${communitySuccess}/${users.length} tested working`);
    
    if (mentorFail > 0 || studentFail > 0) {
      console.log('\n  ⚠️  Some users have no subscriptions — they need to:');
      console.log('     1. Open studdybuddy.a5x.in');
      console.log('     2. Allow notifications when prompted');
      console.log('     3. Refresh the page');
    } else {
      console.log('\n  🎉 All notifications working perfectly!');
    }

    process.exit(0);
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });
