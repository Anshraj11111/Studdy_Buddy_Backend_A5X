/**
 * Cleanup Script: Fix Multiple Reactions Per User
 * This script ensures each user has only ONE reaction per message (WhatsApp style)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SchoolChannelMessage from './src/models/SchoolChannelMessage.js';

dotenv.config();

async function cleanupReactions() {
  try {
    console.log('🔧 Starting reaction cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all messages with reactions
    const messages = await SchoolChannelMessage.find({
      'reactions.0': { $exists: true }
    });

    console.log(`📊 Found ${messages.length} messages with reactions`);

    let updatedCount = 0;
    let totalReactionsBefore = 0;
    let totalReactionsAfter = 0;

    for (const message of messages) {
      const originalReactionsCount = message.reactions.length;
      totalReactionsBefore += originalReactionsCount;

      // Group reactions by userId
      const reactionsByUser = new Map();
      
      message.reactions.forEach(reaction => {
        const userId = reaction.userId.toString();
        
        // Keep only the LAST reaction from each user (most recent)
        reactionsByUser.set(userId, reaction);
      });

      // Convert map back to array (one reaction per user)
      const cleanedReactions = Array.from(reactionsByUser.values());
      totalReactionsAfter += cleanedReactions.length;

      // Update message if reactions changed
      if (cleanedReactions.length !== originalReactionsCount) {
        message.reactions = cleanedReactions;
        await message.save();
        updatedCount++;
        
        console.log(`✅ Message ${message._id}: ${originalReactionsCount} → ${cleanedReactions.length} reactions`);
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Messages updated: ${updatedCount}`);
    console.log(`   Total reactions before: ${totalReactionsBefore}`);
    console.log(`   Total reactions after: ${totalReactionsAfter}`);
    console.log(`   Duplicate reactions removed: ${totalReactionsBefore - totalReactionsAfter}`);
    console.log('\n✅ Cleanup completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupReactions();
