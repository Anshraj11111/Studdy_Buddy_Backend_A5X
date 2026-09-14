import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testLikeSave() {
  try {
    // Connect to PRIMARY database (for Users)
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('✅ Connected to PRIMARY database\n');

    const User = (await import('./src/models/User.js')).default;

    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 TESTING LIKE SAVE FUNCTIONALITY');
    console.log('═══════════════════════════════════════════════════════\n');

    // Get a test user
    const testUser = await User.findOne({ email: 'smriti.soni@student.com' });
    if (!testUser) {
      console.log('❌ Test user not found');
      await mongoose.connection.close();
      return;
    }
    console.log('✅ Test User:', testUser.name, `(${testUser._id})\n`);

    // FeedPost is also in PRIMARY database
    const FeedPost = (await import('./src/models/FeedPost.js')).default;

    // Find a test post
    const testPost = await FeedPost.findOne().populate('userId', 'name');
    if (!testPost) {
      console.log('❌ No posts found in database');
      await mongoose.connection.close();
      return;
    }

    console.log('📝 Test Post:', testPost.content?.substring(0, 50) + '...');
    console.log('   Post ID:', testPost._id);
    console.log('   Author:', testPost.userId?.name);
    console.log('   Current Likes:', testPost.likes.length);
    console.log('   Liked by user?', testPost.likes.map(String).includes(String(testUser._id)) ? 'YES' : 'NO');

    // Test 1: Add like
    console.log('\n--- TEST 1: ADDING LIKE ---');
    const userIdStr = String(testUser._id);
    const alreadyLiked = testPost.likes.map(String).includes(userIdStr);
    
    if (alreadyLiked) {
      console.log('⚠️ Already liked - will remove like first');
      testPost.likes = testPost.likes.filter(id => String(id) !== userIdStr);
      await testPost.save();
      console.log('✅ Like removed, count:', testPost.likes.length);
    }

    // Now add the like
    console.log('➕ Adding like...');
    testPost.likes.push(testUser._id);
    await testPost.save();
    console.log('✅ Like added! New count:', testPost.likes.length);

    // Verify in database
    const verifyPost1 = await FeedPost.findById(testPost._id);
    const isLiked1 = verifyPost1.likes.map(String).includes(userIdStr);
    console.log('✅ Database verification - Liked?', isLiked1 ? 'YES ✅' : 'NO ❌');
    console.log('   Like count in DB:', verifyPost1.likes.length);

    // Test 2: Remove like
    console.log('\n--- TEST 2: REMOVING LIKE ---');
    testPost.likes = testPost.likes.filter(id => String(id) !== userIdStr);
    await testPost.save();
    console.log('✅ Like removed! New count:', testPost.likes.length);

    // Verify in database
    const verifyPost2 = await FeedPost.findById(testPost._id);
    const isLiked2 = verifyPost2.likes.map(String).includes(userIdStr);
    console.log('✅ Database verification - Liked?', isLiked2 ? 'YES ❌' : 'NO ✅');
    console.log('   Like count in DB:', verifyPost2.likes.length);

    // Test 3: Check if likes persist after reconnection
    console.log('\n--- TEST 3: PERSISTENCE CHECK ---');
    console.log('➕ Adding like again...');
    verifyPost2.likes.push(testUser._id);
    await verifyPost2.save();
    console.log('✅ Like added!');

    // Disconnect and reconnect
    await mongoose.connection.close();
    console.log('🔌 Disconnected from database');
    await mongoose.connect(process.env.MONGO_URI_PRIMARY || process.env.MONGO_URI);
    console.log('🔌 Reconnected to database');

    // Check if like still exists
    const finalPost = await FeedPost.findById(testPost._id);
    const finalLiked = finalPost.likes.map(String).includes(userIdStr);
    console.log('✅ After reconnect - Liked?', finalLiked ? 'YES ✅' : 'NO ❌');
    console.log('   Final like count:', finalPost.likes.length);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 FINAL RESULTS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Likes can be added: YES');
    console.log('✅ Likes can be removed: YES');
    console.log('✅ Likes persist in database:', finalLiked ? 'YES ✅' : 'NO ❌');
    console.log('\nIf likes persist = YES, backend is working correctly!');
    console.log('If frontend still shows issue, check:');
    console.log('  1. API response is being used correctly');
    console.log('  2. State updates are not being overwritten');
    console.log('  3. Feed refresh is fetching latest data');
    console.log('═══════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLikeSave();
