import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import Doubt from '../models/Doubt.js';
import MessageService from './message.service.js';
import AuthService from './auth.service.js';

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

describe('MessageService Unit Tests', () => {
  let user1;
  let user2;
  let room;

  beforeEach(async () => {
    // Create users
    user1 = await User.create({
      name: 'User 1',
      email: 'user1@test.com',
      password: await AuthService.hashPassword('password123'),
      role: 'student',
    });

    user2 = await User.create({
      name: 'User 2',
      email: 'user2@test.com',
      password: await AuthService.hashPassword('password123'),
      role: 'student',
    });

    // Create doubts
    const doubt1 = await Doubt.create({
      title: 'Doubt 1',
      description: 'Description 1',
      topic: 'motors',
      tags: [],
      userId: user1._id,
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

    // Create room
    room = await Room.create({
      student1: user1._id,
      student2: user2._id,
      doubt1: doubt1._id,
      doubt2: doubt2._id,
      topic: 'motors',
      status: 'active',
    });
  });

  describe('saveMessage', () => {
    it('should save a message successfully', async () => {
      const message = await MessageService.saveMessage(
        user1._id,
        room._id,
        'Hello, how are you?'
      );

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, how are you?');
      expect(message.senderId._id.toString()).toBe(user1._id.toString());
      expect(message.roomId.toString()).toBe(room._id.toString());
    });

    it('should trim whitespace from message content', async () => {
      const message = await MessageService.saveMessage(
        user1._id,
        room._id,
        '  Hello  '
      );

      expect(message.content).toBe('Hello');
    });

    it('should reject empty messages', async () => {
      await expect(
        MessageService.saveMessage(user1._id, room._id, '')
      ).rejects.toThrow('Message content cannot be empty');
    });

    it('should reject messages exceeding 5000 characters', async () => {
      const longContent = 'a'.repeat(5001);
      await expect(
        MessageService.saveMessage(user1._id, room._id, longContent)
      ).rejects.toThrow('Message content cannot exceed 5000 characters');
    });

    it('should accept messages up to 5000 characters', async () => {
      const longContent = 'a'.repeat(5000);
      const message = await MessageService.saveMessage(
        user1._id,
        room._id,
        longContent
      );

      expect(message.content).toBe(longContent);
    });
  });

  describe('getMessagesByRoom', () => {
    it('should retrieve messages for a room', async () => {
      await MessageService.saveMessage(user1._id, room._id, 'Message 1');
      await MessageService.saveMessage(user2._id, room._id, 'Message 2');
      await MessageService.saveMessage(user1._id, room._id, 'Message 3');

      const messages = await MessageService.getMessagesByRoom(room._id);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
      expect(messages[2].content).toBe('Message 3');
    });

    it('should return messages in chronological order', async () => {
      await MessageService.saveMessage(user1._id, room._id, 'First');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await MessageService.saveMessage(user2._id, room._id, 'Second');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await MessageService.saveMessage(user1._id, room._id, 'Third');

      const messages = await MessageService.getMessagesByRoom(room._id);

      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });

    it('should support pagination', async () => {
      for (let i = 1; i <= 25; i++) {
        await MessageService.saveMessage(user1._id, room._id, `Message ${i}`);
      }

      const page1 = await MessageService.getMessagesByRoom(room._id, {
        page: 1,
        limit: 10,
      });
      const page2 = await MessageService.getMessagesByRoom(room._id, {
        page: 2,
        limit: 10,
      });
      const page3 = await MessageService.getMessagesByRoom(room._id, {
        page: 3,
        limit: 10,
      });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page3).toHaveLength(5);
    });

    it('should return empty array for room with no messages', async () => {
      const messages = await MessageService.getMessagesByRoom(room._id);

      expect(messages).toHaveLength(0);
    });
  });

  describe('getMessageCount', () => {
    it('should return correct message count', async () => {
      await MessageService.saveMessage(user1._id, room._id, 'Message 1');
      await MessageService.saveMessage(user2._id, room._id, 'Message 2');

      const count = await MessageService.getMessageCount(room._id);

      expect(count).toBe(2);
    });

    it('should return 0 for room with no messages', async () => {
      const count = await MessageService.getMessageCount(room._id);

      expect(count).toBe(0);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      const message = await MessageService.saveMessage(
        user1._id,
        room._id,
        'Message to delete'
      );

      await MessageService.deleteMessage(message._id);

      const messages = await MessageService.getMessagesByRoom(room._id);
      expect(messages).toHaveLength(0);
    });

    it('should throw error when deleting non-existent message', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(MessageService.deleteMessage(fakeId)).rejects.toThrow(
        'Message not found'
      );
    });
  });

  describe('getLatestMessages', () => {
    it('should return latest messages in chronological order', async () => {
      for (let i = 1; i <= 10; i++) {
        await MessageService.saveMessage(user1._id, room._id, `Message ${i}`);
      }

      const latest = await MessageService.getLatestMessages(room._id, 5);

      expect(latest).toHaveLength(5);
      expect(latest[0].content).toBe('Message 6');
      expect(latest[4].content).toBe('Message 10');
    });
  });

  describe('getMessagesByTimeRange', () => {
    it('should retrieve messages within time range', async () => {
      const msg1 = await MessageService.saveMessage(
        user1._id,
        room._id,
        'Message 1'
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      const msg2 = await MessageService.saveMessage(
        user2._id,
        room._id,
        'Message 2'
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      const msg3 = await MessageService.saveMessage(
        user1._id,
        room._id,
        'Message 3'
      );

      const startTime = new Date(msg1.createdAt.getTime() - 50);
      const endTime = new Date(msg2.createdAt.getTime() + 50);

      const messages = await MessageService.getMessagesByTimeRange(
        room._id,
        startTime,
        endTime
      );

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
    });
  });
});
