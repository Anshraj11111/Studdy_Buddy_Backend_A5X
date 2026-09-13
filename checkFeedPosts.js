import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkFeedPosts = async () => {
  try {
    // Check all three databases
    console.log('🔍 Checking all databases for posts...\n');
    
    // PRIMARY
    await mongoose.connect(process.env.MONGO_URI_PRIMARY);
    console.log('✅ Connected to PRIMARY database');
    
    const FeedPostPrimary = mongoose.model('FeedPost', new mongoose.Schema({}, { strict: false }));
    const feedPostsPrimary = await FeedPostPrimary.find({}).lean();
    console.log(`📊 PRIMARY - FeedPosts: ${feedPostsPrimary.length}`);
    await mongoose.disconnect();
    
    // SECONDARY
    await mongoose.connect(process.env.MONGO_URI_SECONDARY);
    console.log('✅ Connected to SECONDARY database');    
    const FeedPostSecondary = mongoose.model('FeedPost2', new mongoose.Schema({}, { strict: false }));
    const feedPostsSecondary = await FeedPostSecondary.find({}).lean();
    console.log(`📊 SECONDARY - FeedPosts: ${feedPostsSecondary.length}`);
    await mongoose.disconnect();
    
    // TERTIARY
    await mongoose.connect(process.env.MONGO_URI_TERTIARY);
    console.log('✅ Connected to TERTIARY database');

    // Get FeedPost model
    const FeedPost = mongoose.model('FeedPost3', new mongoose.Schema({}, { strict: false }));
    const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }));

    // Check feedposts
    const feedPosts = await FeedPost.find({}).lean();
    console.log(`📊 TERTIARY - FeedPosts: ${feedPosts.length}`);

    // Check posts
    const posts = await Post.find({}).lean();
    console.log(`📊 TERTIARY - Posts: ${posts.length}`);

    console.log('\n📝 FeedPosts Preview (from database with most posts):');
    const allPosts = [...feedPostsPrimary, ...feedPostsSecondary, ...feedPosts];
    allPosts.slice(0, 5).forEach((post, idx) => {
      console.log(`${idx + 1}. ${post.content?.substring(0, 50)}...`);
      console.log(`   Category: ${post.category}, Likes: ${post.likes?.length || 0}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkFeedPosts();
