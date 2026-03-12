import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doubt from '../models/Doubt.js';
import Room from '../models/Room.js';
import MatchService from './match.service.js';
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
  await Doubt.deleteMany({});
  await Room.deleteMany({});
});

describe('MatchService Unit Tests', () => {
  describe('findAndMatch', () => {
    it('should find matching doubt and create room', async () => {
      // Create two users
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      // Create first doubt
      const doubt1 = await Doubt.create({
        title: 'How to use motors?',
        description: 'I need help with motors',
        topic: 'motors',
        tags: ['robotics'],
        userId: user1._id,
        status: 'open',
      });

      // Create second doubt with same topic
      const doubt2 = await Doubt.create({
        title: 'Motor control',
        description: 'How to control motors?',
        topic: 'motors',
        tags: ['robotics'],
        userId: user2._id,
        status: 'open',
      });

      // Match the second doubt
      const room = await MatchService.findAndMatch(doubt2._id);

      expect(room).not.toBeNull();
      expect(room.student1._id.toString()).toBe(user1._id.toString());
      expect(room.student2._id.toString()).toBe(user2._id.toString());
      expect(room.topic).toBe('motors');
      expect(room.status).toBe('active');
    });

    it('should return null when no matching doubt found', async () => {
      // Create user
      const user = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      // Create doubt with unique topic
      const doubt = await Doubt.create({
        title: 'Unique doubt',
        description: 'This is unique',
        topic: 'unique-topic',
        tags: [],
        userId: user._id,
        status: 'open',
      });

      // Try to match
      const room = await MatchService.findAndMatch(doubt._id);

      expect(room).toBeNull();
    });

    it('should not match with non-open doubts', async () => {
      // Create two users
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      // Create first doubt with matched status
      const doubt1 = await Doubt.create({
        title: 'How to use motors?',
        description: 'I need help with motors',
        topic: 'motors',
        tags: ['robotics'],
        userId: user1._id,
        status: 'matched',
      });

      // Create second doubt with same topic
      const doubt2 = await Doubt.create({
        title: 'Motor control',
        description: 'How to control motors?',
        topic: 'motors',
        tags: ['robotics'],
        userId: user2._id,
        status: 'open',
      });

      // Try to match
      const room = await MatchService.findAndMatch(doubt2._id);

      expect(room).toBeNull();
    });

    it('should throw error if doubt not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(MatchService.findAndMatch(fakeId)).rejects.toThrow(
        'Doubt not found'
      );
    });
  });

  describe('createRoom', () => {
    it('should create room with correct data', async () => {
      // Create two users
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      // Create two doubts
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
      const room = await MatchService.createRoom(
        user1._id,
        user2._id,
        doubt1._id,
        doubt2._id,
        'motors'
      );

      expect(room).toHaveProperty('_id');
      expect(room.student1._id.toString()).toBe(user1._id.toString());
      expect(room.student2._id.toString()).toBe(user2._id.toString());
      expect(room.doubt1._id.toString()).toBe(doubt1._id.toString());
      expect(room.doubt2._id.toString()).toBe(doubt2._id.toString());
      expect(room.topic).toBe('motors');
      expect(room.status).toBe('active');
    });
  });

  describe('getRoomById', () => {
    it('should retrieve room by ID', async () => {
      // Create users and doubts
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

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
      const createdRoom = await MatchService.createRoom(
        user1._id,
        user2._id,
        doubt1._id,
        doubt2._id,
        'motors'
      );

      // Retrieve room
      const retrievedRoom = await MatchService.getRoomById(createdRoom._id);

      expect(retrievedRoom._id.toString()).toBe(createdRoom._id.toString());
      expect(retrievedRoom.topic).toBe('motors');
    });

    it('should throw error if room not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(MatchService.getRoomById(fakeId)).rejects.toThrow(
        'Room not found'
      );
    });
  });

  describe('getRoomsByUser', () => {
    it('should retrieve all rooms for a user', async () => {
      // Create three users
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user3 = await User.create({
        name: 'User 3',
        email: 'user3@test.com',
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

      const doubt3 = await Doubt.create({
        title: 'Doubt 3',
        description: 'Description 3',
        topic: 'sensors',
        tags: [],
        userId: user3._id,
        status: 'open',
      });

      // Create rooms
      await MatchService.createRoom(
        user1._id,
        user2._id,
        doubt1._id,
        doubt2._id,
        'motors'
      );

      await MatchService.createRoom(
        user1._id,
        user3._id,
        doubt1._id,
        doubt3._id,
        'sensors'
      );

      // Get rooms for user1
      const rooms = await MatchService.getRoomsByUser(user1._id);

      expect(rooms).toHaveLength(2);
      expect(rooms[0].student1._id.toString()).toBe(user1._id.toString());
    });
  });

  describe('updateRoomStatus', () => {
    it('should update room status', async () => {
      // Create users and doubts
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

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
      const room = await MatchService.createRoom(
        user1._id,
        user2._id,
        doubt1._id,
        doubt2._id,
        'motors'
      );

      // Update status
      const updatedRoom = await MatchService.updateRoomStatus(
        room._id,
        'completed'
      );

      expect(updatedRoom.status).toBe('completed');
    });

    it('should throw error for invalid status', async () => {
      // Create users and doubts
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

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
      const room = await MatchService.createRoom(
        user1._id,
        user2._id,
        doubt1._id,
        doubt2._id,
        'motors'
      );

      // Try to update with invalid status
      await expect(
        MatchService.updateRoomStatus(room._id, 'invalid')
      ).rejects.toThrow('Invalid room status');
    });
  });

  describe('getActiveRoomsCount', () => {
    it('should return count of active rooms', async () => {
      // Create users and doubts
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

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
      const room = await MatchService.createRoom(
        user1._id,
        user2._id,
        doubt1._id,
        doubt2._id,
        'motors'
      );

      // Get count
      let count = await MatchService.getActiveRoomsCount();
      expect(count).toBe(1);

      // Update room status to completed
      await MatchService.updateRoomStatus(room._id, 'completed');

      // Get count again
      count = await MatchService.getActiveRoomsCount();
      expect(count).toBe(0);
    });
  });
});
