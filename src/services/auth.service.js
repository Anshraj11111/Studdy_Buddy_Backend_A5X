import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SchoolChannel from '../models/SchoolChannel.js';

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user object
   */
  async register(userData) {
    try {
      const { name, email, password, role, skills, mentorCode, schoolName, city } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: role || 'student',
        skills: skills || [],
        mentorCode: mentorCode || null,
        schoolName: schoolName || '',
        city: city || '',
      });

      // Auto-join school channel for students (only if channel exists)
      if ((role === 'student' || !role) && schoolName && city) {
        await this.autoJoinSchoolChannel(user);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Auto-join user to their school channel (only if channel exists)
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async autoJoinSchoolChannel(user) {
    try {
      if (!user.schoolName || !user.city) {
        console.log(`⚠️ User ${user.name} has no school info - cannot auto-join`);
        return;
      }

      const channelId = SchoolChannel.generateChannelId(user.schoolName, user.city);
      console.log(`🔍 Looking for channel with ID: ${channelId} for user ${user.name} (school: ${user.schoolName}, city: ${user.city})`);

      // Find existing school channel (DO NOT CREATE automatically)
      const channel = await SchoolChannel.findOne({ channelId });

      if (channel) {
        // Add user to existing channel if not already a member
        // Convert ObjectIds to strings for comparison
        const memberIds = channel.members.map(id => String(id));
        const userId = String(user._id);
        
        if (!memberIds.includes(userId)) {
          channel.members.push(user._id);
          channel.stats.totalMembers = channel.members.length;
          channel.stats.lastActivityAt = new Date();
          await channel.save();
          console.log(`✅ Student ${user.name} auto-joined channel: ${channelId} (${channel.schoolName}, ${channel.city})`);
        } else {
          console.log(`ℹ️ Student ${user.name} already a member of channel: ${channelId}`);
        }
      } else {
        // Channel doesn't exist - student will see "no channel" message
        console.log(`⚠️ No channel exists for channelId: ${channelId} (${user.schoolName}, ${user.city}) - student ${user.name} cannot join`);
        
        // List all available channels for debugging
        const allChannels = await SchoolChannel.find({}).select('channelId schoolName city').lean();
        console.log(`📋 Available channels:`, allChannels.map(c => `${c.channelId} (${c.schoolName}, ${c.city})`));
      }
    } catch (error) {
      console.error('Error auto-joining school channel:', error);
      // Don't throw error to prevent registration failure
    }
  }

  /**
   * Login user and generate JWT token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User object and JWT token
   */
  async login(email, password) {
    try {
      // Find user by email - select only needed fields
      const user = await User.findOne({ email })
        .select('_id name email role skills profileImage bannerImage headline bio address socialLinks education experience xp mentorCode password schoolName city')
        .lean();
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Compare password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Auto-join school channel for students (if not already joined)
      if ((user.role === 'student' || !user.role) && user.schoolName && user.city) {
        // Convert lean object to mongoose document for auto-join
        const userDoc = await User.findById(user._id);
        await this.autoJoinSchoolChannel(userDoc);
      }

      // Remove password from response
      delete user.password;

      // Generate JWT token
      const token = this.generateToken(user._id);

      return { user, token };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify JWT token and return user
   * @param {string} token - JWT token
   * @returns {Promise<Object>} User object
   */
  async verifyToken(token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 6; // Reduced to 6 for faster hashing
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare plain text password with hashed password
   * @param {string} plaintext - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePassword(plaintext, hash) {
    return await bcrypt.compare(plaintext, hash);
  }

  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @returns {string} JWT token
   */
  generateToken(userId) {
    // Ensure expiresIn is in correct format (string like '24h' or number in seconds)
    const expiresIn = process.env.JWT_EXPIRE || '24h';
    
    // Validate format - if it's a plain number without unit, convert to seconds
    const validatedExpiry = /^\d+$/.test(expiresIn) ? parseInt(expiresIn) : expiresIn;
    
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: validatedExpiry }
    );
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user object
   */
  async updateProfile(userId, updateData) {
    try {
      // Don't allow updating email or password through this method
      const { email, password, ...allowedUpdates } = updateData;

      const user = await User.findByIdAndUpdate(
        userId,
        allowedUpdates,
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
