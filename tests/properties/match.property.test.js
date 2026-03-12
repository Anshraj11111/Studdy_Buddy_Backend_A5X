import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fc from 'fast-check';
import User from '../../src/models/User.js';
import Doubt from '../../src/models/Doubt.js';
import Room from '../../src/models/Room.js';
import MatchService from '../../src/services/match.service.js';
import AuthService from '../../src/services/auth.service.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Doubt.deleteMany({});
  await Room.deleteMany({});
});

describe('MatchService Property Tests', () => {
  // Property 9: Doubt Matching Detection
  it('Property 9: Should detect matching doubts with same topic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (userName1, userName2, topic) => {
          // Create two users
          const user1 = await User.create({
            name: userName1,
            email: `user1-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          const user2 = await User.create({
            name: userName2,
            email: `user2-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          // Create first doubt
          const doubt1 = await Doubt.create({
            title: 'Doubt 1',
            description: 'Description 1',
            topic,
            tags: ['tag1'],
            userId: user1._id,
            status: 'open',
          });

          // Create second doubt with same topic
          const doubt2 = await Doubt.create({
            title: 'Doubt 2',
            description: 'Description 2',
            topic,
            tags: ['tag2'],
            userId: user2._id,
            status: 'open',
          });

          // Try to match the second doubt
          const room = await MatchService.findAndMatch(doubt2._id);

          // Verify room was created
          expect(room).not.toBeNull();
          expect(room.student1.toString()).toBe(user1._id.toString());
          expect(room.student2.toString()).toBe(user2._id.toString());
          expect(room.topic).toBe(topic);
          expect(room.status).toBe('active');

          // Verify both doubts are now matched
          const updatedDoubt1 = await Doubt.findById(doubt1._id);
          const updatedDoubt2 = await Doubt.findById(doubt2._id);
          expect(updatedDoubt1.status).toBe('matched');
          expect(updatedDoubt2.status).toBe('matched');
        }
      ),
      { numRuns: 50 }
    );
  });

  // Property 10: Room Creation from Match
  it('Property 10: Should create room with correct structure from match', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (user1Name, user2Name, topic) => {
          // Create two users
          const user1 = await User.create({
            name: user1Name,
            email: `user1-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          const user2 = await User.create({
            name: user2Name,
            email: `user2-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          // Create first doubt
          const doubt1 = await Doubt.create({
            title: 'Doubt 1',
            description: 'Description 1',
            topic,
            tags: [],
            userId: user1._id,
            status: 'open',
          });

          // Create second doubt with same topic
          const doubt2 = await Doubt.create({
            title: 'Doubt 2',
            description: 'Description 2',
            topic,
            tags: [],
            userId: user2._id,
            status: 'open',
          });

          // Match the second doubt
          const room = await MatchService.findAndMatch(doubt2._id);

          // Verify room structure
          expect(room).toHaveProperty('_id');
          expect(room).toHaveProperty('student1');
          expect(room).toHaveProperty('student2');
          expect(room).toHaveProperty('doubt1');
          expect(room).toHaveProperty('doubt2');
          expect(room).toHaveProperty('topic');
          expect(room).toHaveProperty('status');
          expect(room).toHaveProperty('createdAt');
          expect(room).toHaveProperty('updatedAt');

          // Verify room references are correct
          expect(room.doubt1._id.toString()).toBe(doubt1._id.toString());
          expect(room.doubt2._id.toString()).toBe(doubt2._id.toString());
        }
      ),
      { numRuns: 50 }
    );
  });

  // Property 11: Matched Doubt Status Update
  it('Property 11: Should update both doubts to matched status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (user1Name, user2Name, topic) => {
          // Create two users
          const user1 = await User.create({
            name: user1Name,
            email: `user1-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          const user2 = await User.create({
            name: user2Name,
            email: `user2-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          // Create first doubt
          const doubt1 = await Doubt.create({
            title: 'Doubt 1',
            description: 'Description 1',
            topic,
            tags: [],
            userId: user1._id,
            status: 'open',
          });

          // Create second doubt with same topic
          const doubt2 = await Doubt.create({
            title: 'Doubt 2',
            description: 'Description 2',
            topic,
            tags: [],
            userId: user2._id,
            status: 'open',
          });

          // Verify initial status
          expect(doubt1.status).toBe('open');
          expect(doubt2.status).toBe('open');

          // Match the second doubt
          await MatchService.findAndMatch(doubt2._id);

          // Verify both doubts are matched
          const updatedDoubt1 = await Doubt.findById(doubt1._id);
          const updatedDoubt2 = await Doubt.findById(doubt2._id);

          expect(updatedDoubt1.status).toBe('matched');
          expect(updatedDoubt2.status).toBe('matched');
        }
      ),
      { numRuns: 50 }
    );
  });

  // Property 12: Unmatched Doubt Status Preservation
  it('Property 12: Should preserve open status when no match found', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (userName, topic1, topic2) => {
          // Create user
          const user = await User.create({
            name: userName,
            email: `user-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          // Create doubt with topic1
          const doubt1 = await Doubt.create({
            title: 'Doubt 1',
            description: 'Description 1',
            topic: topic1,
            tags: [],
            userId: user._id,
            status: 'open',
          });

          // Create doubt with different topic (topic2)
          const doubt2 = await Doubt.create({
            title: 'Doubt 2',
            description: 'Description 2',
            topic: topic2,
            tags: [],
            userId: user._id,
            status: 'open',
          });

          // Try to match doubt2 (should not find a match)
          const room = await MatchService.findAndMatch(doubt2._id);

          // Verify no room was created
          expect(room).toBeNull();

          // Verify doubt1 status is still open
          const updatedDoubt1 = await Doubt.findById(doubt1._id);
          expect(updatedDoubt1.status).toBe('open');

          // Verify doubt2 status is still open
          const updatedDoubt2 = await Doubt.findById(doubt2._id);
          expect(updatedDoubt2.status).toBe('open');
        }
      ),
      { numRuns: 50 }
    );
  });
});
