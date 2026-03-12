import fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import doubtService from '../../src/services/doubt.service.js';
import authService from '../../src/services/auth.service.js';
import Doubt from '../../src/models/Doubt.js';
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
  await Doubt.deleteMany({});
  await User.deleteMany({});
});

describe('Doubt Property-Based Tests', () => {
  // Feature: studdy-buddy-backend, Property 6: Doubt Creation with User Association
  test('Property 6: doubts are created with correct userId and open status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 50 }),
          userEmail: fc.emailAddress(),
          userPassword: fc.string({ minLength: 6, maxLength: 50 }),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ minLength: 1, maxLength: 500 }),
          topic: fc.string({ minLength: 1, maxLength: 50 }),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
        }),
        async (userData) => {
          try {
            // Create user
            const user = await authService.register({
              name: userData.userName,
              email: userData.userEmail,
              password: userData.userPassword,
              role: 'student',
            });

            // Create doubt
            const doubt = await doubtService.createDoubt({
              title: userData.title,
              description: userData.description,
              topic: userData.topic,
              tags: userData.tags,
              userId: user._id,
            });

            // Verify doubt properties
            expect(doubt.userId.toString()).toBe(user._id.toString());
            expect(doubt.status).toBe('open');
            expect(doubt.title).toBe(userData.title);
            expect(doubt.description).toBe(userData.description);
            expect(doubt.topic).toBe(userData.topic);
            expect(doubt.tags).toEqual(userData.tags);
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

  // Feature: studdy-buddy-backend, Property 7: Doubt Retrieval Round Trip
  test('Property 7: created doubts can be retrieved by ID with same data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 50 }),
          userEmail: fc.emailAddress(),
          userPassword: fc.string({ minLength: 6, maxLength: 50 }),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ minLength: 1, maxLength: 500 }),
          topic: fc.string({ minLength: 1, maxLength: 50 }),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
        }),
        async (userData) => {
          try {
            // Create user
            const user = await authService.register({
              name: userData.userName,
              email: userData.userEmail,
              password: userData.userPassword,
              role: 'student',
            });

            // Create doubt
            const createdDoubt = await doubtService.createDoubt({
              title: userData.title,
              description: userData.description,
              topic: userData.topic,
              tags: userData.tags,
              userId: user._id,
            });

            // Retrieve doubt
            const retrievedDoubt = await doubtService.getDoubtById(createdDoubt._id);

            // Verify round trip
            expect(retrievedDoubt._id.toString()).toBe(createdDoubt._id.toString());
            expect(retrievedDoubt.title).toBe(createdDoubt.title);
            expect(retrievedDoubt.description).toBe(createdDoubt.description);
            expect(retrievedDoubt.topic).toBe(createdDoubt.topic);
            expect(retrievedDoubt.tags).toEqual(createdDoubt.tags);
            expect(retrievedDoubt.status).toBe(createdDoubt.status);
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

  // Feature: studdy-buddy-backend, Property 8: Pagination Consistency
  test('Property 8: pagination returns all doubts exactly once without duplicates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 50 }),
          userEmail: fc.emailAddress(),
          userPassword: fc.string({ minLength: 6, maxLength: 50 }),
          doubtCount: fc.integer({ min: 5, max: 20 }),
          pageSize: fc.integer({ min: 2, max: 5 }),
        }),
        async (userData) => {
          try {
            // Create user
            const user = await authService.register({
              name: userData.userName,
              email: userData.userEmail,
              password: userData.userPassword,
              role: 'student',
            });

            // Create multiple doubts
            const createdDoubts = [];
            for (let i = 0; i < userData.doubtCount; i++) {
              const doubt = await doubtService.createDoubt({
                title: `Doubt ${i}`,
                description: `Description ${i}`,
                topic: 'test-topic',
                tags: [],
                userId: user._id,
              });
              createdDoubts.push(doubt);
            }

            // Paginate through all doubts
            const allRetrievedDoubts = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
              const doubts = await doubtService.getDoubts(
                { topic: 'test-topic' },
                { page, limit: userData.pageSize }
              );

              if (doubts.length === 0) {
                hasMore = false;
              } else {
                allRetrievedDoubts.push(...doubts);
                page++;
              }
            }

            // Verify all doubts were retrieved
            expect(allRetrievedDoubts.length).toBe(userData.doubtCount);

            // Verify no duplicates
            const doubtIds = allRetrievedDoubts.map(d => d._id.toString());
            const uniqueIds = new Set(doubtIds);
            expect(uniqueIds.size).toBe(userData.doubtCount);

            // Verify all created doubts are in retrieved list
            const createdIds = new Set(createdDoubts.map(d => d._id.toString()));
            const retrievedIds = new Set(doubtIds);
            expect(createdIds).toEqual(retrievedIds);
          } catch (error) {
            if (!error.message.includes('Email already exists')) {
              throw error;
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
