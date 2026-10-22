import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const FeedPost = mongoose.model('FeedPost', new mongoose.Schema({}, { strict: false }));

mongoose.connect(process.env.MONGO_URI_PRIMARY)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const posts = await FeedPost.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id content createdAt');
    
    console.log('📝 Recent Post IDs:\n');
    posts.forEach((p, i) => {
      console.log(`${i+1}. ID: ${p._id}`);
      console.log(`   Content: ${p.content?.substring(0, 60)}...`);
      console.log(`   Created: ${p.createdAt}\n`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
