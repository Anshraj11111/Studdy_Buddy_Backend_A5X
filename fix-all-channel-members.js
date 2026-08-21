import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SchoolChannel from './src/models/SchoolChannel.js';
import User from './src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI_PRIMARY;

async function fixAllChannelMembers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const channels = await SchoolChannel.find({});
    console.log(`\n📊 Found ${channels.length} channels\n`);

    for (const channel of channels) {
      console.log(`\n🔍 Checking: ${channel.schoolName} (${channel.city})`);
      console.log(`   Current members array length: ${channel.members.length}`);
      console.log(`   Current stats.totalMembers: ${channel.stats.totalMembers}`);

      // Remove duplicates
      const uniqueMembers = [...new Set(channel.members.map(id => String(id)))];
      console.log(`   After removing duplicates: ${uniqueMembers.length}`);

      // Verify each member exists
      const existingUsers = await User.find({
        _id: { $in: uniqueMembers }
      }).select('_id name').lean();

      const validMemberIds = existingUsers.map(u => u._id);
      console.log(`   Valid members (exist in DB): ${validMemberIds.length}`);

      if (validMemberIds.length !== uniqueMembers.length) {
        const orphanedCount = uniqueMembers.length - validMemberIds.length;
        console.log(`   ❌ Found ${orphanedCount} orphaned member IDs`);
      }

      // Update channel
      await SchoolChannel.findByIdAndUpdate(channel._id, {
        members: validMemberIds,
        'stats.totalMembers': validMemberIds.length,
      });

      console.log(`   ✅ Updated to ${validMemberIds.length} members`);
      
      // Show member names
      if (existingUsers.length > 0) {
        console.log(`   👥 Members: ${existingUsers.map(u => u.name).join(', ')}`);
      }
    }

    console.log('\n✨ All channels fixed!\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixAllChannelMembers();
