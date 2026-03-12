import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fc from 'fast-check';
import User from '../../src/models/User.js';
import Room from '../../src/models/Room.js';
import Message from '../../src/models/Message.js';
import Doubt from '../../src/models/Doubt.js';
import MessageService from '../../src/services/message.service.js';
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
  await Room.deleteMany({});
  await Message.deleteMany({});
  await Doubt.deleteMany({});
});

describe('MessageService Property Tests', () => {
  // Property 14: Chat History Chronological Order
  it('Property 14: Messages should be returned in chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 1, maxLength: 500 }),
          { minLength: 1, maxLength: 20 }
        ),
        async (messageContents) => {
          // Create user and room
          const user = await User.create({
            name: 'Test User',
            email: `user-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          const user2 = await User.create({
            name: 'Test User 2',
            email: `user2-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          const doubt1 = await Doubt.create({
            title: 'Doubt 1',
            description: 'Description 1',
            topic: 'motors',
            tags: [],
            userId: user._id,
            status: 'open',
          });

          const doubt2 = await Doubt.create({
            title: 'Doubt 2',
            description: 'Description 2',
            topic: 'motors',
            tags: [],
            userId: user2._id,
            status: 'open',
          });

          const room = await Room.create({
            student1: user._id,
            student2: user2._id,
            doubt1: doubt1._id,
            doubt2: doubt2._id,
            topic: 'motors',
            status: 'active',
          });

          // Save messages
          const savedMessages = [];
          for (const content of messageContents) {
            const msg = await MessageService.saveMessage(
              user._id,
              room._id,
              content
            );
            savedMessages.push(msg);
            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 1));
          }

          // Retrieve messages
          const retrievedMessages = await MessageService.getMessagesByRoom(
            room._id,
            { page: 1, limit: 100 }
          );

          // Verify chronological order
          expect(retrievedMessages).toHaveLength(messageContents.length);
          for (let i = 1; i < retrievedMessages.length; i++) {
            const prevTime = new Date(retrievedMessages[i - 1].createdAt);
            const currTime = new Date(retrievedMessages[i].createdAt);
            expect(prevTime.getTime()).toBeLessThanOrEqual(currTime.getTime());
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property test for message persistence
  it('Property 14b: Saved messages should be retrievable with exact content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (messageContent) => {
          // Create user and room
          const user = await User.create({
            name: 'Test User',
            email: `user-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          const user2 = await User.create({
            name: 'Test User 2',
            email: `user2-${Date.now()}@test.com`,
            password: await AuthService.hashPassword('password123'),
            role: 'student',
          });

          const doubt1 = await Doubt.create({
            title: 'Doubt 1',
            description: 'Description 1',
            topic: 'motors',
            tags: [],
            userId: user._id,
            status: 'open',
          });

          const doubt2 = await Doubt.create({
            title: 'Doubt 2',
            description: 'Description 2',
            topic: 'motors',
            tags: [],
            userId: user2._id,
            status: 'open',
          });

          const room = await Room.create({
            student1: user._id,
            student2: user2._id,
            doubt1: doubt1._id,
            doubt2: doubt2._id,
            topic: 'motors',
            status: 'active',
          });

          // Save message
          const savedMessage = await MessageService.saveMessage(
            user._id,
            room._id,
            messageContent
          );

          // Retrieve message
          const retrievedMessages = await MessageService.getMessagesByRoom(
            room._id,
            { page: 1, limit: 100 }
          );

          // Verify content is preserved
          expect(retrievedMessages).toHaveLength(1);
          expect(retrievedMessages[0].content).toBe(messageContent.trim());
          expect(retrievedMessages[0].senderId._id.toString()).toBe(
            user._id.toString()
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
