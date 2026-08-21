import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const schoolChannelSchema = new mongoose.Schema({
  channelId: String,
  schoolName: String,
  city: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  stats: {
    totalMembers: Number,
    totalMessages: Number,
    lastActivityAt: Date,
  },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
}, { timestamps: true });

const SchoolChannel = mongoose.model('SchoolChannel', schoolChannelSchema);
const User = mongoose.model('User', userSchema);

async function removeOrphanedMembers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    console.log('🧹 Removing orphaned member IDs from all channels...\n');

    const channels = await SchoolChannel.find();
    let totalOrphansRemoved = 0;
    let channelsUpdated = 0;

    for (const channel of channels) {
      const beforeCount = channel.members.length;
      
      // Fetch existing users
      const existingUsers = await User.find({ _id: { $in: channel.members } });
      const existingUserIds = existingUsers.map(u => String(u._id));
      
      // Filter out orphaned IDs
      const validMembers = channel.members.filter(id => 
        existingUserIds.includes(String(id))
      );
      
      const orphansCount = beforeCount - validMembers.length;
      
      if (orphansCount > 0) {
        console.log(`🔧 Channel: ${channel.schoolName}, ${channel.city}`);
        console.log(`   Before: ${beforeCount} members`);
        console.log(`   After: ${validMembers.length} members`);
        console.log(`   ❌ Removed ${orphansCount} orphaned ID(s)\n`);
        
        channel.members = validMembers;
        channel.stats.totalMembers = validMembers.length;
        await channel.save();
        
        channelsUpdated++;
        totalOrphansRemoved += orphansCount;
      } else {
        console.log(`✅ Channel: ${channel.schoolName}, ${channel.city} - No orphans`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Cleanup Complete!');
    console.log(`📊 Channels processed: ${channels.length}`);
    console.log(`🔧 Channels updated: ${channelsUpdated}`);
    console.log(`❌ Total orphaned IDs removed: ${totalOrphansRemoved}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  }
}

removeOrphanedMembers();
