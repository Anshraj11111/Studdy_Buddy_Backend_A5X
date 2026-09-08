/**
 * Test script to verify daily post XP limit (3 posts per day)
 * 
 * Usage: node testDailyPostLimit.js <userId>
 * Example: node testDailyPostLimit.js 6a96b1ea881e8cc39c9519c1
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import { addXP } from './src/services/xp.service.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studdy-buddy';

async function testDailyPostLimit(userId) {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get user's initial state
    const userBefore = await User.findById(userId).select('name xp dailyPostCount lastPostDate');
    if (!userBefore) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('\n📊 BEFORE TEST:');
    console.log(`User: ${userBefore.name}`);
    console.log(`XP: ${userBefore.xp}`);
    console.log(`Daily Post Count: ${userBefore.dailyPostCount || 0}`);
    console.log(`Last Post Date: ${userBefore.lastPostDate || 'Never'}`);

    // Reset counter for fresh test
    await User.findByIdAndUpdate(userId, {
      $set: { dailyPostCount: 0, lastPostDate: null }
    });
    console.log('\n🔄 Reset daily post count to 0 for testing');

    // Simulate 5 posts
    console.log('\n🧪 TESTING: Creating 5 posts...\n');
    
    for (let i = 1; i <= 5; i++) {
      const xpBefore = (await User.findById(userId).select('xp')).xp;
      await addXP(userId, 'post');
      const xpAfter = (await User.findById(userId).select('xp')).xp;
      const xpGained = xpAfter - xpBefore;
      
      console.log(`Post ${i}: ${xpGained > 0 ? `✅ +${xpGained} XP` : '⛔ No XP (limit reached)'}`);
      
      // Small delay to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get final state
    const userAfter = await User.findById(userId).select('name xp dailyPostCount lastPostDate');
    
    console.log('\n📊 AFTER TEST:');
    console.log(`XP: ${userAfter.xp} (gained: +${userAfter.xp - userBefore.xp})`);
    console.log(`Daily Post Count: ${userAfter.dailyPostCount}`);
    console.log(`Last Post Date: ${userAfter.lastPostDate}`);

    // Verify results
    const expectedXP = userBefore.xp + (20 * 3); // Only 3 posts should get XP (20 each) + possible streak bonus
    const actualXP = userAfter.xp;
    
    console.log('\n🎯 RESULTS:');
    if (userAfter.dailyPostCount === 5) {
      console.log('✅ Post count tracking works: 5/5 posts counted');
    } else {
      console.log(`⚠️ Post count mismatch: Expected 5, got ${userAfter.dailyPostCount}`);
    }
    
    // Allow some margin for streak bonuses
    if (actualXP >= expectedXP && actualXP <= expectedXP + 50) {
      console.log(`✅ XP limit works: Only first 3 posts got XP (${actualXP - userBefore.xp} total XP gained)`);
    } else {
      console.log(`❌ XP limit FAILED: Expected ~${expectedXP}, got ${actualXP}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Get userId from command line
const userId = process.argv[2];
if (!userId) {
  console.log('Usage: node testDailyPostLimit.js <userId>');
  console.log('Example: node testDailyPostLimit.js 6a96b1ea881e8cc39c9519c1');
  process.exit(1);
}

testDailyPostLimit(userId);
