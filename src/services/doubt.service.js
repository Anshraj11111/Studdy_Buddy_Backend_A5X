import Doubt from '../models/Doubt.js';

class DoubtService {
  /**
   * Create a new doubt
   * @param {Object} doubtData - Doubt data
   * @returns {Promise<Object>} Created doubt
   */
  async createDoubt(doubtData) {
    try {
      const { title, description, topic, tags, userId } = doubtData;

      const doubt = await Doubt.create({
        title,
        description,
        topic,
        tags: tags || [],
        userId,
        status: 'open',
      });

      return doubt;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all doubts with pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Array of doubts
   */
  async getDoubts(filters = {}, pagination = { page: 1, limit: 10 }) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      const query = {};

      // Apply filters
      if (filters.topic) {
        query.topic = filters.topic;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.userId) {
        query.userId = filters.userId;
      }
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      const doubts = await Doubt.find(query)
        .populate('userId', 'name email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return doubts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get total count of doubts
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Number>} Total count
   */
  async getDoubtsCount(filters = {}) {
    try {
      const query = {};

      if (filters.topic) {
        query.topic = filters.topic;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.userId) {
        query.userId = filters.userId;
      }

      const count = await Doubt.countDocuments(query);
      return count;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get doubt by ID
   * @param {string} doubtId - Doubt ID
   * @returns {Promise<Object>} Doubt object
   */
  async getDoubtById(doubtId) {
    try {
      const doubt = await Doubt.findById(doubtId).populate(
        'userId',
        'name email profileImage skills xp'
      );

      if (!doubt) {
        throw new Error('Doubt not found');
      }

      return doubt;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find a matching doubt with the same topic
   * @param {string} topic - Topic to match
   * @param {string} excludeDoubtId - Doubt ID to exclude from search
   * @returns {Promise<Object|null>} Matching doubt or null
   */
  async findMatchingDoubt(topic, excludeDoubtId = null) {
    try {
      const query = {
        topic,
        status: 'open',
      };

      if (excludeDoubtId) {
        query._id = { $ne: excludeDoubtId };
      }

      const matchingDoubt = await Doubt.findOne(query);

      return matchingDoubt;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update doubt status
   * @param {string} doubtId - Doubt ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated doubt
   */
  async updateDoubtStatus(doubtId, status) {
    try {
      const doubt = await Doubt.findByIdAndUpdate(
        doubtId,
        { status },
        { new: true, runValidators: true }
      );

      if (!doubt) {
        throw new Error('Doubt not found');
      }

      return doubt;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search doubts by keyword
   * @param {string} keyword - Search keyword
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Array of matching doubts
   */
  async searchDoubts(keyword, pagination = { page: 1, limit: 10 }) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      const doubts = await Doubt.find({
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { tags: { $regex: keyword, $options: 'i' } },
        ],
      })
        .populate('userId', 'name email profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return doubts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get doubts by topic
   * @param {string} topic - Topic name
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Array of doubts
   */
  async getDoubtsByTopic(topic, pagination = { page: 1, limit: 10 }) {
    try {
      return this.getDoubts({ topic }, pagination);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update doubt
   * @param {string} doubtId - Doubt ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated doubt
   */
  async updateDoubt(doubtId, updates) {
    try {
      const { title, description, topic, tags } = updates;

      const doubt = await Doubt.findByIdAndUpdate(
        doubtId,
        { title, description, topic, tags },
        { new: true, runValidators: true }
      ).populate('userId', 'name email profileImage');

      if (!doubt) {
        throw new Error('Doubt not found');
      }

      return doubt;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete doubt
   * @param {string} doubtId - Doubt ID
   * @returns {Promise<Object>} Deleted doubt
   */
  async deleteDoubt(doubtId) {
    try {
      const doubt = await Doubt.findByIdAndDelete(doubtId);

      if (!doubt) {
        throw new Error('Doubt not found');
      }

      return doubt;
    } catch (error) {
      throw error;
    }
  }
}

export default new DoubtService();
