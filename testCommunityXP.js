import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import FeedPost from './src/models/FeedPost.js';
import { addXP, XP_REWARDS } from './src/services/xp.service.js';

dotenv.config();

/**
 * Test script to verify XP is being awarded for community actions
 */

async function testCommunityXP() {
  try {
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to MongoDB\n');

    // Find a recent post
    const recentPost = await FeedPost.findOne()
      .populate('userId', 'name email xp')
      .sort({ createdAt: -1 });

    if (!recentPost) {
      console.log('❌ No posts found in database');
      process.exit(1);
    }

    console.log('📊 RECENT POST DETAILS:');
    console.log('═'.repeat(70));
    console.log('Post ID:', recentPost._id);
    console.log('Content:', recentPost.content.substring(0, 100) + '...');
    console.log('Author:', recentPost.userId?.name);
    console.log('Author Email:', recentPost.userId?.email);
    console.log('Author XP:', recentPost.userId?.xp || 0);
    console.log('Likes:', recentPost.likes?.length || 0);
    console.log('Comments:', recentPost.comments?.length || 0);
    console.log('Created:', recentPost.createdAt);
    console.log('═'.repeat(70));

    // Check XP history of the author
    const author = await User.findById(recentPost.userId._id).select('xp xpHistory streak dailyPostCount lastPostDate');
    
    if (author) {
      console.log('\n📈 AUTHOR XP HISTORY (Last 10):');
      console.log('═'.repeat(70));
      console.log('Total XP:', author.xp);
      console.log('Streak:', author.streak?.current || 0, 'days');
      console.log('Daily Posts Today:', author.dailyPostCount || 0);
      console.log('Last Post Date:', author.lastPostDate);
      
      if (author.xpHistory && author.xpHistory.length > 0) {
        console.log('\nRecent XP Awards:');
        author.xpHistory.slice(-10).forEach((entry, idx) => {
          console.log(`  ${idx + 1}. ${entry.action} → +${entry.amount} XP (${new Date(entry.createdAt).toLocaleString()})`);
        });
      } else {
        console.log('\n⚠️  NO XP HISTORY FOUND!');
      }
      console.log('═'.repeat(70));
    }

    // Check if there are any likes on this post
    if (recentPost.likes && recentPost.likes.length > 0) {
      console.log('\n👍 CHECKING LIKE XP:');
      console.log('═'.repeat(70));
      
      const liker = await User.findById(recentPost.likes[0]).select('name xp xpHistory');
      if (liker) {
        console.log('Liker:', liker.name);
        console.log('Liker XP:', liker.xp);
        console.log('\nRecent XP History:');
        liker.xpHistory?.slice(-5).forEach((entry, idx) => {
          console.log(`  ${idx + 1}. ${entry.action} → +${entry.amount} XP`);
        });
      }
      console.log('═'.repeat(70));
    }

    // Check XP rewards configuration
    console.log('\n💰 XP REWARDS CONFIGURATION:');
    console.log('═'.repeat(70));
    console.log('post:            ', XP_REWARDS.post, 'XP');
    console.log('like_received:   ', XP_REWARDS.like_received, 'XP');
    console.log('comment:         ', XP_REWARDS.comment, 'XP');
    console.log('comment_received:', XP_REWARDS.comment_received, 'XP');
    console.log('daily_login:     ', XP_REWARDS.daily_login, 'XP');
    console.log('streak_bonus:    ', XP_REWARDS.streak_bonus, 'XP');
    console.log('═'.repeat(70));

    // Test XP addition manually
    console.log('\n🧪 TESTING XP ADDITION:');
    console.log('═'.repeat(70));
    
    const testUser = await User.findOne({ role: 'student' }).select('name email xp');
    if (testUser) {
      const beforeXP = testUser.xp;
      console.log(`Test User: ${testUser.name} (${testUser.email})`);
      console.log(`XP Before: ${beforeXP}`);
      
      // Try adding test XP
      await addXP(testUser._id, 'post');
      
      const afterUser = await User.findById(testUser._id).select('xp xpHistory dailyPostCount');
      console.log(`XP After: ${afterUser.xp}`);
      console.log(`Change: ${afterUser.xp - beforeXP} XP`);
      console.log(`Daily Post Count: ${afterUser.dailyPostCount || 0}`);
      
      if (afterUser.xp > beforeXP) {
        console.log('✅ XP system is WORKING!');
      } else {
        console.log('❌ XP not added - possible daily limit reached or other issue');
        console.log('Latest XP History:');
        afterUser.xpHistory?.slice(-3).forEach(entry => {
          console.log(`  - ${entry.action}: +${entry.amount} XP at ${new Date(entry.createdAt).toLocaleString()}`);
        });
      }
    }
    console.log('═'.repeat(70));

    // Summary
    console.log('\n📋 DIAGNOSIS:');
    console.log('═'.repeat(70));
    console.log('1. Check if posts are being created successfully');
    console.log('2. Check if xpHistory is being updated');
    console.log('3. Check daily post limit (max 3 posts per day get XP)');
    console.log('4. Check if backend is restarted after XP changes');
    console.log('5. Check browser console for any errors');
    console.log('═'.repeat(70));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCommunityXP();
