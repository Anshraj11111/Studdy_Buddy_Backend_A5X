/**
 * Clear All Reactions Script
 * Removes all reactions from all messages
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SchoolChannelMessage from './src/models/SchoolChannelMessage.js';

dotenv.config();

async function clearAllReactions() {
  try {
    console.log('🗑️ Clearing all reactions...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Update all messages - set reactions to empty array
    const result = await SchoolChannelMessage.updateMany(
      { 'reactions.0': { $exists: true } }, // Only update messages that have reactions
      { $set: { reactions: [] } }
    );

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Messages found with reactions: ${result.matchedCount}`);
    console.log(`   Messages updated: ${result.modifiedCount}`);
    console.log('\n✅ All reactions cleared successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

clearAllReactions();
