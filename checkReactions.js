/**
 * Check Reactions in Database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SchoolChannelMessage from './src/models/SchoolChannelMessage.js';

dotenv.config();

async function checkReactions() {
  try {
    console.log('🔍 Checking reactions in database...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const messages = await SchoolChannelMessage.find({
      'reactions.0': { $exists: true }
    }).select('_id content reactions').lean();

    if (messages.length === 0) {
      console.log('✅ No messages with reactions found - all clear!');
    } else {
      console.log(`📊 Found ${messages.length} messages with reactions:\n`);
      
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. Message: ${msg.content.substring(0, 50)}...`);
        console.log(`   Reactions (${msg.reactions.length}):`);
        msg.reactions.forEach(r => {
          console.log(`   - ${r.emoji} by user ${r.userId}`);
        });
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkReactions();
