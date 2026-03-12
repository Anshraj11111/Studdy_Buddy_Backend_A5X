import Room from '../models/Room.js';
import Doubt from '../models/Doubt.js';

class MatchService {
  /**
   * Find a matching doubt and create a room if found
   * @param {string} doubtId - The newly created doubt ID
   * @returns {Object|null} - Room object if match found, null otherwise
   */
  async findAndMatch(doubtId) {
    try {
      // Get the newly created doubt
      const newDoubt = await Doubt.findById(doubtId).populate('userId');
      if (!newDoubt) {
        throw new Error('Doubt not found');
      }

      console.log('Finding match for doubt:', {
        doubtId: newDoubt._id,
        topic: newDoubt.topic,
        userId: newDoubt.userId._id,
        status: newDoubt.status
      });

      // Find an open doubt with the same topic (excluding the current doubt and current user's doubts)
      const matchingDoubt = await Doubt.findOne({
        _id: { $ne: doubtId },
        userId: { $ne: newDoubt.userId._id }, // Exclude current user's doubts
        topic: newDoubt.topic,
        status: 'open',
      }).populate('userId');

      console.log('Matching doubt found:', matchingDoubt ? {
        doubtId: matchingDoubt._id,
        topic: matchingDoubt.topic,
        userId: matchingDoubt.userId._id,
        status: matchingDoubt.status
      } : 'No match');

      if (!matchingDoubt) {
        // No match found, return null
        return null;
      }

      // Create a room with both students
      const room = await this.createRoom(
        newDoubt.userId._id,
        matchingDoubt.userId._id,
        newDoubt._id,
        matchingDoubt._id,
        newDoubt.topic
      );

      console.log('Room created:', room._id);

      // Update both doubts to "matched" status
      await Doubt.findByIdAndUpdate(newDoubt._id, { status: 'matched' });
      await Doubt.findByIdAndUpdate(matchingDoubt._id, { status: 'matched' });

      return room;
    } catch (error) {
      console.error('Error in findAndMatch:', error);
      throw error;
    }
  }

  /**
   * Create a room for two students
   * @param {string} student1Id - First student ID
   * @param {string} student2Id - Second student ID
   * @param {string} doubt1Id - First doubt ID
   * @param {string} doubt2Id - Second doubt ID
   * @param {string} topic - Topic of the doubts
   * @returns {Object} - Created room object
   */
  async createRoom(student1Id, student2Id, doubt1Id, doubt2Id, topic) {
    try {
      const room = new Room({
        student1: student1Id,
        student2: student2Id,
        doubt1: doubt1Id,
        doubt2: doubt2Id,
        topic,
        status: 'active',
      });

      await room.save();
      return room.populate(['student1', 'student2', 'doubt1', 'doubt2']);
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Get room by ID
   * @param {string} roomId - Room ID
   * @returns {Object} - Room object with populated references
   */
  async getRoomById(roomId) {
    try {
      const room = await Room.findById(roomId)
        .populate('student1')
        .populate('student2')
        .populate('doubt1')
        .populate('doubt2');

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      console.error('Error getting room:', error);
      throw error;
    }
  }

  /**
   * Get rooms for a specific user
   * @param {string} userId - User ID
   * @returns {Array} - Array of room objects
   */
  async getRoomsByUser(userId) {
    try {
      const rooms = await Room.find({
        $or: [{ student1: userId }, { student2: userId }],
      })
        .populate('student1')
        .populate('student2')
        .populate('doubt1')
        .populate('doubt2')
        .sort({ createdAt: -1 });

      return rooms;
    } catch (error) {
      console.error('Error getting rooms by user:', error);
      throw error;
    }
  }

  /**
   * Update room status
   * @param {string} roomId - Room ID
   * @param {string} status - New status (active, completed, abandoned)
   * @returns {Object} - Updated room object
   */
  async updateRoomStatus(roomId, status) {
    try {
      if (!['active', 'completed', 'abandoned'].includes(status)) {
        throw new Error('Invalid room status');
      }

      const room = await Room.findByIdAndUpdate(
        roomId,
        { status },
        { new: true }
      )
        .populate('student1')
        .populate('student2')
        .populate('doubt1')
        .populate('doubt2');

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      console.error('Error updating room status:', error);
      throw error;
    }
  }

  /**
   * Get active rooms count
   * @returns {number} - Count of active rooms
   */
  async getActiveRoomsCount() {
    try {
      const count = await Room.countDocuments({ status: 'active' });
      return count;
    } catch (error) {
      console.error('Error getting active rooms count:', error);
      throw error;
    }
  }
}

export default new MatchService();
