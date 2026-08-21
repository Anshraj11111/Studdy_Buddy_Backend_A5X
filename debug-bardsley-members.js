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
  schoolName: String,
  city: String,
}, { timestamps: true });

const SchoolChannel = mongoose.model('SchoolChannel', schoolChannelSchema);
const User = mongoose.model('User', userSchema);

async function debugBardsley() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Bardsley channel
    const channel = await SchoolChannel.findOne({ 
      schoolName: 'Bardsley',
      city: 'Katni'
    });

    if (!channel) {
      console.log('❌ Bardsley channel not found');
      return;
    }

    console.log('📋 Bardsley Channel Info:');
    console.log(`   Channel ID: ${channel.channelId}`);
    console.log(`   Members array length: ${channel.members.length}`);
    console.log(`   Stats totalMembers: ${channel.stats.totalMembers}`);
    console.log(`\n   Member IDs in array:`);
    
    channel.members.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });

    // Check for duplicates
    const memberIds = channel.members.map(id => String(id));
    const uniqueIds = [...new Set(memberIds)];
    console.log(`\n   Unique member count: ${uniqueIds.length}`);
    
    if (memberIds.length !== uniqueIds.length) {
      console.log(`   ⚠️ ${memberIds.length - uniqueIds.length} duplicate(s) found!`);
    }

    // Fetch actual user data
    console.log('\n👥 Actual Users:');
    const users = await User.find({ _id: { $in: channel.members } });
    console.log(`   Found ${users.length} existing users:\n`);
    
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      ID: ${user._id}`);
      console.log(`      School: ${user.schoolName}, ${user.city}\n`);
    });

    // Check if there are missing users
    if (users.length < channel.members.length) {
      console.log(`\n⚠️ WARNING: ${channel.members.length - users.length} member ID(s) don't exist in User collection!`);
      console.log('   These are orphaned/deleted user references.\n');
      
      // Find orphaned IDs
      const existingIds = users.map(u => String(u._id));
      const orphanedIds = memberIds.filter(id => !existingIds.includes(id));
      
      console.log('   Orphaned IDs:');
      orphanedIds.forEach((id, index) => {
        console.log(`   ${index + 1}. ${id}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  }
}

debugBardsley();
