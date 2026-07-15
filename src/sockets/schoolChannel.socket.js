import SchoolChannel from '../models/SchoolChannel.js';
import SchoolChannelMessage from '../models/SchoolChannelMessage.js';
import User from '../models/User.js';

export const setupSchoolChannelSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('🏫 User connected to school channel:', socket.id);

    // Join user's school channel
    socket.on('school-channel:join', async (data) => {
      try {
        const { userId } = data;
        const user = await User.findById(userId);
        
        if (!user || !user.schoolName || !user.city) {
          socket.emit('school-channel:error', { message: 'User has no school information' });
          return;
        }

        const channelId = SchoolChannel.generateChannelId(user.schoolName, user.city);
        socket.join(channelId);
        
        console.log(`✅ User ${user.name} joined channel: ${channelId}`);
        socket.emit('school-channel:joined', { channelId });
      } catch (error) {
        console.error('Error joining school channel:', error);
        socket.emit('school-channel:error', { message: 'Failed to join channel' });
      }
    });

    // Send message to school channel
    socket.on('school-channel:message', async (data) => {
      try {
        const { userId, channelId, content, messageType, attachments } = data;
        
        // Verify user is member of this channel
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('school-channel:error', { message: 'User not found' });
          return;
        }

        const channel = await SchoolChannel.findOne({ channelId });
        if (!channel) {
          socket.emit('school-channel:error', { message: 'Channel not found' });
          return;
        }

        if (!channel.members.some(m => m.toString() === userId)) {
          socket.emit('school-channel:error', { message: 'Not a member of this channel' });
          return;
        }

        // Check if students can post
        if (user.role === 'student' && !channel.settings.studentsCanPost) {
          socket.emit('school-channel:error', { message: 'Only admins can post' });
          return;
        }

        // Create and save message
        const message = await SchoolChannelMessage.create({
          channelId,
          channel: channel._id,
          sender: userId,
          content,
          messageType: messageType || 'text',
          attachments: attachments || [],
        });

        // Update channel stats
        await SchoolChannel.findByIdAndUpdate(channel._id, {
          'stats.totalMessages': channel.stats.totalMessages + 1,
          'stats.lastActivityAt': new Date(),
        });

        // Populate sender info
        await message.populate('sender', 'name profileImage role');

        // Broadcast to all members in the channel
        io.to(channelId).emit('school-channel:new-message', message);
        
        console.log(`📨 Message sent to channel ${channelId} by ${user.name}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('school-channel:error', { message: 'Failed to send message' });
      }
    });

    // Delete message
    socket.on('school-channel:delete-message', async (data) => {
      try {
        const { userId, messageId, channelId } = data;
        
        const message = await SchoolChannelMessage.findById(messageId);
        if (!message) {
          socket.emit('school-channel:error', { message: 'Message not found' });
          return;
        }

        // Only sender can delete their own message
        if (message.sender.toString() !== userId) {
          socket.emit('school-channel:error', { message: 'Cannot delete others messages' });
          return;
        }

        message.isDeleted = true;
        await message.save();

        // Broadcast deletion
        io.to(channelId).emit('school-channel:message-deleted', { messageId });
        
        console.log(`🗑️ Message ${messageId} deleted from channel ${channelId}`);
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('school-channel:error', { message: 'Failed to delete message' });
      }
    });

    // Add reaction
    socket.on('school-channel:react', async (data) => {
      try {
        const { userId, messageId, channelId, emoji } = data;
        
        const message = await SchoolChannelMessage.findById(messageId);
        if (!message) {
          socket.emit('school-channel:error', { message: 'Message not found' });
          return;
        }

        // Toggle reaction
        const existingReaction = message.reactions.find(
          r => r.userId.toString() === userId && r.emoji === emoji
        );

        if (existingReaction) {
          message.reactions = message.reactions.filter(
            r => !(r.userId.toString() === userId && r.emoji === emoji)
          );
        } else {
          message.reactions.push({ emoji, userId });
        }

        await message.save();
        await message.populate('sender', 'name profileImage role');

        // Broadcast reaction update
        io.to(channelId).emit('school-channel:reaction-updated', message);
        
        console.log(`👍 Reaction ${emoji} toggled on message ${messageId}`);
      } catch (error) {
        console.error('Error adding reaction:', error);
        socket.emit('school-channel:error', { message: 'Failed to add reaction' });
      }
    });

    // Pin/Unpin message (admin only)
    socket.on('school-channel:pin-message', async (data) => {
      try {
        const { userId, messageId, channelId, pinned } = data;
        
        const user = await User.findById(userId);
        if (user.role !== 'mentor') {
          socket.emit('school-channel:error', { message: 'Only admins can pin messages' });
          return;
        }

        const message = await SchoolChannelMessage.findByIdAndUpdate(
          messageId,
          { isPinned: pinned },
          { new: true }
        ).populate('sender', 'name profileImage role');

        if (!message) {
          socket.emit('school-channel:error', { message: 'Message not found' });
          return;
        }

        // Broadcast pin status update
        io.to(channelId).emit('school-channel:message-pinned', message);
        
        console.log(`📌 Message ${messageId} pin status: ${pinned}`);
      } catch (error) {
        console.error('Error pinning message:', error);
        socket.emit('school-channel:error', { message: 'Failed to pin message' });
      }
    });

    // User is typing
    socket.on('school-channel:typing', (data) => {
      const { channelId, userName } = data;
      socket.to(channelId).emit('school-channel:user-typing', { userName });
    });

    // User stopped typing
    socket.on('school-channel:stop-typing', (data) => {
      const { channelId, userName } = data;
      socket.to(channelId).emit('school-channel:user-stop-typing', { userName });
    });

    // Leave channel
    socket.on('school-channel:leave', (data) => {
      const { channelId } = data;
      socket.leave(channelId);
      console.log(`👋 User left channel: ${channelId}`);
    });

    socket.on('disconnect', () => {
      console.log('🏫 User disconnected from school channel:', socket.id);
    });
  });
};
