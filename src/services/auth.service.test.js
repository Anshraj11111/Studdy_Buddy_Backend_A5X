import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authService from './auth.service.js';
import User from '../models/User.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

afterEach(async () => {
  await User.deleteMany({});
});

describe('AuthService Edge Cases', () => {
  describe('Registration', () => {
    test('should reject registration with existing email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'student',
      };

      // Register first user
      await authService.register(userData);

      // Try to register with same email
      await expect(
        authService.register({
          name: 'Another User',
          email: 'test@example.com',
          password: 'different123',
        })
      ).rejects.toThrow('Email already exists');
    });

    test('should create user with default values', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const user = await authService.register(userData);

      expect(user.role).toBe('student');
      expect(user.xp).toBe(0);
      expect(user.skills).toEqual([]);
      expect(user.profileImage).toBe('');
    });

    test('should lowercase email', async () => {
      const userData = {
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      };

      const user = await authService.register(userData);

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Login', () => {
    test('should reject login with invalid credentials', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      await authService.register(userData);

      // Try to login with wrong password
      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    test('should reject login with non-existent email', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    test('should return user and token on successful login', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      await authService.register(userData);

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('password');
      expect(typeof result.token).toBe('string');
    });
  });

  describe('Token Verification', () => {
    test('should reject invalid token', async () => {
      await expect(
        authService.verifyToken('invalid.token.here')
      ).rejects.toThrow('Invalid token');
    });

    test('should reject expired token', async () => {
      // Create a token that expires immediately
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const user = await authService.register(userData);

      // Manually create an expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      await expect(
        authService.verifyToken(expiredToken)
      ).rejects.toThrow('Token expired');
    });

    test('should verify valid token', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const registeredUser = await authService.register(userData);
      const { token } = await authService.login('test@example.com', 'password123');

      const verifiedUser = await authService.verifyToken(token);

      expect(verifiedUser._id.toString()).toBe(registeredUser._id.toString());
      expect(verifiedUser.email).toBe(registeredUser.email);
    });

    test('should reject token for deleted user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      await authService.register(userData);
      const { token } = await authService.login('test@example.com', 'password123');

      // Delete the user
      await User.deleteMany({});

      await expect(
        authService.verifyToken(token)
      ).rejects.toThrow('User not found');
    });
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash.length).toBeGreaterThanOrEqual(60);
    });

    test('should compare passwords correctly', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);

      const isMatch = await authService.comparePassword(password, hash);
      expect(isMatch).toBe(true);

      const isNotMatch = await authService.comparePassword('wrongpassword', hash);
      expect(isNotMatch).toBe(false);
    });
  });

  describe('Profile Update', () => {
    test('should update user profile', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const user = await authService.register(userData);

      const updatedUser = await authService.updateProfile(user._id, {
        name: 'Updated Name',
        skills: ['JavaScript', 'Node.js'],
        xp: 100,
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.skills).toEqual(['JavaScript', 'Node.js']);
      expect(updatedUser.xp).toBe(100);
    });

    test('should not allow updating email through updateProfile', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const user = await authService.register(userData);

      const updatedUser = await authService.updateProfile(user._id, {
        email: 'newemail@example.com',
        name: 'Updated Name',
      });

      // Email should remain unchanged
      expect(updatedUser.email).toBe('test@example.com');
      expect(updatedUser.name).toBe('Updated Name');
    });

    test('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        authService.updateProfile(fakeId, { name: 'Test' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('Get User By ID', () => {
    test('should get user by ID', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const registeredUser = await authService.register(userData);
      const fetchedUser = await authService.getUserById(registeredUser._id);

      expect(fetchedUser._id.toString()).toBe(registeredUser._id.toString());
      expect(fetchedUser.email).toBe(registeredUser.email);
    });

    test('should throw error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        authService.getUserById(fakeId)
      ).rejects.toThrow('User not found');
    });
  });
});
