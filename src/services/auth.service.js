import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user object
   */
  async register(userData) {
    try {
      const { name, email, password, role, skills, mentorCode } = userData;

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
      });

      return user;
    } catch (error) {
      throw error;
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
      // Find user by email
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Compare password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const token = this.generateToken(user._id);

      // Remove password from user object
      const userObject = user.toObject();
      delete userObject.password;

      return {
        user: userObject,
        token,
      };
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
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
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
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
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
