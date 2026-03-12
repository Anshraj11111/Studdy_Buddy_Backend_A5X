import fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authService from '../../src/services/auth.service.js';
import User from '../../src/models/User.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 120000); // 2 minute timeout for MongoDB download

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

afterEach(async () => {
  await User.deleteMany({});
});

describe('Authentication Property-Based Tests', () => {
  // Feature: studdy-buddy-backend, Property 1: Password Hashing Invariant
  test('Property 1: passwords are always hashed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          role: fc.constantFrom('student', 'mentor'),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
        }),
        async (userData) => {
          try {
            const user = await authService.register(userData);
            const dbUser = await User.findById(user._id).select('+password');
            
            // Password should never equal plaintext
            expect(dbUser.password).not.toBe(userData.password);
            
            // Password should be a bcrypt hash (starts with $2a$, $2b$, or $2y$)
            expect(dbUser.password).toMatch(/^\$2[aby]\$/);
            
            // Hash should be at least 60 characters (bcrypt standard)
            expect(dbUser.password.length).toBeGreaterThanOrEqual(60);
          } catch (error) {
            // If registration fails due to duplicate email, that's expected in property tests
            if (!error.message.includes('Email already exists')) {
              throw error;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: studdy-buddy-backend, Property 2: JWT Authentication Round Trip
  test('Property 2: JWT token round trip preserves user identity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          role: fc.constantFrom('student', 'mentor'),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
        }),
        async (userData) => {
          try {
            // Register user
            const registeredUser = await authService.register(userData);
            
            // Login to get token
            const { user, token } = await authService.login(userData.email, userData.password);
            
            // Verify token returns same user
            const verifiedUser = await authService.verifyToken(token);
            
            expect(verifiedUser._id.toString()).toBe(registeredUser._id.toString());
            expect(verifiedUser.email).toBe(registeredUser.email);
            expect(verifiedUser.name).toBe(registeredUser.name);
          } catch (error) {
            if (!error.message.includes('Email already exists')) {
              throw error;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: studdy-buddy-backend, Property 3: Authentication Rejection
  test('Property 3: invalid credentials are always rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          wrongPassword: fc.string({ minLength: 6, maxLength: 50 }),
        }),
        async (userData) => {
          // Ensure wrong password is different
          fc.pre(userData.password !== userData.wrongPassword);
          
          try {
            // Register user
            await authService.register({
              name: userData.name,
              email: userData.email,
              password: userData.password,
              role: 'student',
            });
            
            // Try to login with wrong password
            await expect(
              authService.login(userData.email, userData.wrongPassword)
            ).rejects.toThrow('Invalid credentials');
            
          } catch (error) {
            if (!error.message.includes('Email already exists')) {
              throw error;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Test login with non-existent email
  test('Property 3b: login with non-existent email is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 50 }),
        async (email, password) => {
          await expect(
            authService.login(email, password)
          ).rejects.toThrow('Invalid credentials');
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: studdy-buddy-backend, Property 4: User Model Completeness
  test('Property 4: created users contain all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          role: fc.constantFrom('student', 'mentor'),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
        }),
        async (userData) => {
          try {
            const user = await authService.register(userData);
            
            // Check all required fields exist
            expect(user).toHaveProperty('name');
            expect(user).toHaveProperty('email');
            expect(user).toHaveProperty('role');
            expect(user).toHaveProperty('skills');
            expect(user).toHaveProperty('xp');
            expect(user).toHaveProperty('profileImage');
            expect(user).toHaveProperty('createdAt');
            expect(user).toHaveProperty('updatedAt');
            
            // Verify field values
            expect(user.name).toBe(userData.name);
            expect(user.email).toBe(userData.email.toLowerCase());
            expect(user.role).toBe(userData.role);
            expect(user.xp).toBe(0);
            expect(Array.isArray(user.skills)).toBe(true);
            
          } catch (error) {
            if (!error.message.includes('Email already exists')) {
              throw error;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
