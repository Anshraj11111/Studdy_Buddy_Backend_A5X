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

describe('Profile Update Property-Based Tests', () => {
  // Feature: studdy-buddy-backend, Property 5: Profile Update Persistence
  test('Property 5: profile updates persist and are retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          updatedName: fc.string({ minLength: 1, maxLength: 50 }),
          skills: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
          xp: fc.integer({ min: 0, max: 10000 }),
        }),
        async (userData) => {
          try {
            // Register user
            const user = await authService.register({
              name: userData.name,
              email: userData.email,
              password: userData.password,
              role: 'student',
            });

            // Update profile
            const updateData = {
              name: userData.updatedName,
              skills: userData.skills,
              xp: userData.xp,
            };

            const updatedUser = await authService.updateProfile(user._id, updateData);

            // Verify update was persisted
            expect(updatedUser.name).toBe(userData.updatedName);
            expect(updatedUser.skills).toEqual(userData.skills);
            expect(updatedUser.xp).toBe(userData.xp);

            // Retrieve user again to verify persistence
            const retrievedUser = await authService.getUserById(user._id);

            expect(retrievedUser.name).toBe(userData.updatedName);
            expect(retrievedUser.skills).toEqual(userData.skills);
            expect(retrievedUser.xp).toBe(userData.xp);

            // Email should not change
            expect(retrievedUser.email).toBe(userData.email.toLowerCase());
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

  // Additional test: Multiple updates should accumulate correctly
  test('Property 5b: multiple profile updates accumulate correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          updates: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              skills: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async (userData) => {
          try {
            // Register user
            const user = await authService.register({
              name: userData.name,
              email: userData.email,
              password: userData.password,
              role: 'student',
            });

            let currentUser = user;

            // Apply multiple updates
            for (const update of userData.updates) {
              currentUser = await authService.updateProfile(currentUser._id, {
                name: update.name,
                skills: update.skills,
              });
            }

            // Verify final state matches last update
            const lastUpdate = userData.updates[userData.updates.length - 1];
            expect(currentUser.name).toBe(lastUpdate.name);
            expect(currentUser.skills).toEqual(lastUpdate.skills);

            // Retrieve and verify persistence
            const retrievedUser = await authService.getUserById(user._id);
            expect(retrievedUser.name).toBe(lastUpdate.name);
            expect(retrievedUser.skills).toEqual(lastUpdate.skills);
          } catch (error) {
            if (!error.message.includes('Email already exists')) {
              throw error;
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  // Test: Email should not be updatable through updateProfile
  test('Property 5c: email cannot be updated through updateProfile', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          newEmail: fc.emailAddress(),
        }),
        async (userData) => {
          // Ensure new email is different
          fc.pre(userData.email !== userData.newEmail);

          try {
            // Register user
            const user = await authService.register({
              name: userData.name,
              email: userData.email,
              password: userData.password,
              role: 'student',
            });

            // Try to update email
            const updatedUser = await authService.updateProfile(user._id, {
              email: userData.newEmail,
              name: 'Updated Name',
            });

            // Email should remain unchanged
            expect(updatedUser.email).toBe(userData.email.toLowerCase());
            expect(updatedUser.name).toBe('Updated Name');

            // Verify in database
            const retrievedUser = await authService.getUserById(user._id);
            expect(retrievedUser.email).toBe(userData.email.toLowerCase());
          } catch (error) {
            if (!error.message.includes('Email already exists')) {
              throw error;
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
