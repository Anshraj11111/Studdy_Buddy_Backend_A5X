import dotenv from 'dotenv';
dotenv.config();

import { getConnection } from './src/config/db-multi.js';
import User from './src/models/User.js';
import PushSubscription from './src/models/PushSubscription.js';
import Doubt from './src/models/Doubt.js';
import Notification from './src/models/Notification.js';

async function testDoubtNotification() {
  try {
    console.log('🔍 Testing Doubt Notification System...\n');
    
    // Connect to databases
    const PRIMARY = await getConnection('primary');
    const SECONDARY = await getConnection('secondary');
    const TERTIARY = await getConnection('tertiary');
    
    console.log('✅ Connected to databases\n');
    
    // 1. Check mentors
    const mentors = await User.find({ role: 'mentor' }).select('_id name email').lean();
    console.log(`📊 Found ${mentors.length} mentors:`);
    mentors.forEach(m => console.log(`   - ${m.name} (${m.email})`));
    console.log('');
    
    // 2. Check push subscriptions for mentors
    for (const mentor of mentors) {
      const subs = await PushSubscription.find({ user: mentor._id }).countDocuments();
      console.log(`   📱 ${mentor.name}: ${subs} push subscription(s)`);
    }
    console.log('');
    
    // 3. Check recent doubts
    const recentDoubts = await Doubt.find().sort({ createdAt: -1 }).limit(3)
      .populate('userId', 'name email')
      .lean();
    
    console.log(`📝 Recent ${recentDoubts.length} doubts:`);
    recentDoubts.forEach(d => {
      console.log(`   - "${d.title}" by ${d.userId?.name || 'Unknown'} (${new Date(d.createdAt).toLocaleString()})`);
    });
    console.log('');
    
    // 4. Check recent notifications
    const recentNotifs = await Notification.find({ type: 'doubt' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('recipient', 'name role')
      .populate('sender', 'name')
      .lean();
    
    console.log(`🔔 Recent ${recentNotifs.length} doubt notifications:`);
    recentNotifs.forEach(n => {
      console.log(`   - To: ${n.recipient?.name} (${n.recipient?.role})`);
      console.log(`     From: ${n.sender?.name}`);
      console.log(`     Message: ${n.message}`);
      console.log(`     Read: ${n.read}`);
      console.log(`     Created: ${new Date(n.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    // 5. Test VAPID configuration
    console.log('🔐 VAPID Configuration:');
    console.log(`   Public Key: ${process.env.VAPID_PUBLIC_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Private Key: ${process.env.VAPID_PRIVATE_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Subject: ${process.env.VAPID_SUBJECT || '❌ Missing'}`);
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('📊 SUMMARY:');
    console.log(`   Mentors: ${mentors.length}`);
    console.log(`   Push Subscriptions: Check above per mentor`);
    console.log(`   Recent Doubts: ${recentDoubts.length}`);
    console.log(`   Recent Notifications: ${recentNotifs.length}`);
    console.log('═══════════════════════════════════════════\n');
    
    if (mentors.length === 0) {
      console.log('⚠️  WARNING: No mentors found! Create a mentor account first.');
    }
    
    const totalSubs = await PushSubscription.find({ 
      user: { $in: mentors.map(m => m._id) } 
    }).countDocuments();
    
    if (totalSubs === 0) {
      console.log('⚠️  WARNING: No push subscriptions! Mentors need to:');
      console.log('   1. Login to frontend');
      console.log('   2. Allow notification permissions');
      console.log('   3. Service worker must be running (production mode)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDoubtNotification();
