import SchoolChannel from '../models/SchoolChannel.js';
import SchoolChannelMessage from '../models/SchoolChannelMessage.js';
import User from '../models/User.js';

class SchoolChannelService {
  /**
   * Get user's school channel
   * @param {string} userId - User ID
   * @returns {Promise<Object>} School channel
   */
  async getUserSchoolChannel(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.schoolName || !user.city) {
        throw new Error('User has no school information');
      }

      const channelId = SchoolChannel.generateChannelId(user.schoolName, user.city);
      const channel = await SchoolChannel.findOne({ channelId })
        .populate('createdBy', 'name email profileImage')
        .lean();

      if (!channel) {
        throw new Error('School channel not found');
      }

      return channel;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get channel messages
   * @param {string} userId - User ID
   * @param {number} limit - Message limit
   * @param {number} skip - Messages to skip
   * @returns {Promise<Array>} Channel messages
   */
  async getChannelMessages(userId, limit = 50, skip = 0) {
    try {
      const channel = await this.getUserSchoolChannel(userId);

      const messages = await SchoolChannelMessage.find({
        channelId: channel.channelId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('sender', 'name profileImage role')
        .lean();

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send message to school channel
   * @param {string} userId - User ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(userId, messageData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const channel = await this.getUserSchoolChannel(userId);

      // Check if user is a member of this channel
      if (!channel.members.some(m => m.toString() === userId)) {
        throw new Error('You are not a member of this channel');
      }

      // Check if students can post
      if (user.role === 'student' && !channel.settings.studentsCanPost) {
        throw new Error('Only admins can post in this channel');
      }

      // Create message
      const message = await SchoolChannelMessage.create({
        channelId: channel.channelId,
        channel: channel._id,
        sender: userId,
        content: messageData.content,
        messageType: messageData.messageType || 'text',
        attachments: messageData.attachments || [],
        isPinned: messageData.isPinned || false,
      });

      // Update channel stats
      await SchoolChannel.findByIdAndUpdate(channel._id, {
        'stats.totalMessages': channel.stats.totalMessages + 1,
        'stats.lastActivityAt': new Date(),
      });

      // Populate sender info
      await message.populate('sender', 'name profileImage role');

      return message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get channel members
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Channel members
   */
  async getChannelMembers(userId) {
    try {
      const channel = await this.getUserSchoolChannel(userId);

      const members = await User.find({
        _id: { $in: channel.members },
      })
        .select('name email profileImage role xp')
        .lean();

      return members;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a message (only sender can delete)
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Deleted message
   */
  async deleteMessage(userId, messageId) {
    try {
      const message = await SchoolChannelMessage.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Only sender can delete their own message
      if (message.sender.toString() !== userId) {
        throw new Error('You can only delete your own messages');
      }

      message.isDeleted = true;
      await message.save();

      return message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pin/Unpin a message (admin only)
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID
   * @param {boolean} pinned - Pin status
   * @returns {Promise<Object>} Updated message
   */
  async pinMessage(userId, messageId, pinned) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only mentors/admins can pin messages
      if (user.role !== 'mentor') {
        throw new Error('Only admins can pin messages');
      }

      const message = await SchoolChannelMessage.findByIdAndUpdate(
        messageId,
        { isPinned: pinned },
        { new: true }
      ).populate('sender', 'name profileImage role');

      if (!message) {
        throw new Error('Message not found');
      }

      return message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add reaction to a message
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji reaction
   * @returns {Promise<Object>} Updated message
   */
  async addReaction(userId, messageId, emoji) {
    try {
      const message = await SchoolChannelMessage.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user already reacted with this emoji
      const existingReaction = message.reactions.find(
        r => r.userId.toString() === userId && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction if already exists
        message.reactions = message.reactions.filter(
          r => !(r.userId.toString() === userId && r.emoji === emoji)
        );
      } else {
        // Add new reaction
        message.reactions.push({ emoji, userId });
      }

      await message.save();
      await message.populate('sender', 'name profileImage role');

      return message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all school channels (admin only)
   * @returns {Promise<Array>} All school channels
   */
  async getAllChannels() {
    try {
      const channels = await SchoolChannel.find({ isActive: true })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      // Add member count to each channel
      const channelsWithCount = channels.map(channel => ({
        ...channel,
        memberCount: channel.members?.length || 0,
      }));

      return channelsWithCount;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new school channel (admin only)
   * @param {string} adminId - Admin user ID
   * @param {Object} channelData - Channel data
   * @returns {Promise<Object>} Created channel
   */
  async createChannel(adminId, channelData) {
    try {
      const { schoolName, city, description } = channelData;

      if (!schoolName || !city) {
        throw new Error('School name and city are required');
      }

      const channelId = SchoolChannel.generateChannelId(schoolName, city);

      // Check if channel already exists
      const existingChannel = await SchoolChannel.findOne({ channelId });
      if (existingChannel) {
        throw new Error('Channel for this school already exists');
      }

      // Create channel
      const channel = await SchoolChannel.create({
        schoolName,
        city,
        channelId,
        description: description || `Official channel for ${schoolName}, ${city}`,
        createdBy: adminId,
        members: [],
        stats: {
          totalMembers: 0,
          totalMessages: 0,
          lastActivityAt: new Date(),
        },
      });

      // Auto-add all students from this school
      const students = await User.find({
        schoolName,
        city,
        role: 'student',
      });

      if (students.length > 0) {
        channel.members = students.map(s => s._id);
        channel.stats.totalMembers = students.length;
        await channel.save();
      }

      return channel;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a school channel (admin only)
   * @param {string} channelId - Channel ID
   * @returns {Promise<void>}
   */
  async deleteChannel(channelId) {
    try {
      const channel = await SchoolChannel.findById(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      // Delete all messages in this channel
      await SchoolChannelMessage.deleteMany({ channel: channelId });

      // Delete the channel
      await SchoolChannel.findByIdAndDelete(channelId);
    } catch (error) {
      throw error;
    }
  }
}

export default new SchoolChannelService();
