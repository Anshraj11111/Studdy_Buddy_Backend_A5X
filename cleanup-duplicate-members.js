import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// SchoolChannel schema (copied from model)
const schoolChannelSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  schoolName: { type: String, required: true },
  city: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  stats: {
    totalMembers: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const SchoolChannel = mongoose.model('SchoolChannel', schoolChannelSchema);

/**
 * Remove duplicate member IDs from all school channels
 */
async function cleanupDuplicateMembers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Starting cleanup of duplicate members...\n');

    // Get all channels
    const channels = await SchoolChannel.find();
    console.log(`📊 Found ${channels.length} channels to process\n`);

    let updatedCount = 0;
    let totalDuplicatesRemoved = 0;

    for (const channel of channels) {
      const originalMemberCount = channel.members.length;
      
      // Remove duplicates using Set
      const uniqueMemberIds = [...new Set(channel.members.map(id => String(id)))];
      
      const duplicatesCount = originalMemberCount - uniqueMemberIds.length;
      
      if (duplicatesCount > 0) {
        console.log(`🔧 Channel: ${channel.schoolName}, ${channel.city}`);
        console.log(`   Before: ${originalMemberCount} members`);
        console.log(`   After: ${uniqueMemberIds.length} members`);
        console.log(`   ❌ Removed ${duplicatesCount} duplicates\n`);

        // Update channel with unique members
        channel.members = uniqueMemberIds;
        channel.stats.totalMembers = uniqueMemberIds.length;
        await channel.save();

        updatedCount++;
        totalDuplicatesRemoved += duplicatesCount;
      } else {
        // Even if no duplicates, ensure stats.totalMembers is correct
        if (channel.stats.totalMembers !== uniqueMemberIds.length) {
          console.log(`🔧 Channel: ${channel.schoolName}, ${channel.city}`);
          console.log(`   Fixing stats.totalMembers: ${channel.stats.totalMembers} → ${uniqueMemberIds.length}\n`);
          
          channel.stats.totalMembers = uniqueMemberIds.length;
          await channel.save();
          updatedCount++;
        } else {
          console.log(`✅ Channel: ${channel.schoolName}, ${channel.city} - No duplicates`);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Cleanup Complete!');
    console.log(`📊 Channels processed: ${channels.length}`);
    console.log(`🔧 Channels updated: ${updatedCount}`);
    console.log(`❌ Total duplicates removed: ${totalDuplicatesRemoved}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run cleanup
cleanupDuplicateMembers();
