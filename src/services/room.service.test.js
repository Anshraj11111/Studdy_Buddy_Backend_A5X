import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Doubt from '../models/Doubt.js';
import RoomService from './room.service.js';
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
  await Doubt.deleteMany({});
});

describe('RoomService Unit Tests', () => {
  let user1;
  let user2;
  let doubt1;
  let doubt2;

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
    doubt1 = await Doubt.create({
      title: 'Doubt 1',
      description: 'Description 1',
      topic: 'motors',
      tags: [],
      userId: user1._id,
      status: 'open',
    });

    doubt2 = await Doubt.create({
      title: 'Doubt 2',
      description: 'Description 2',
      topic: 'motors',
      tags: [],
      userId: user2._id,
      status: 'open',
    });
  });

  describe('getRoomById', () => {
    it('should retrieve room by ID', async () => {
      const room = await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      const retrievedRoom = await RoomService.getRoomById(room._id);

      expect(retrievedRoom._id.toString()).toBe(room._id.toString());
      expect(retrievedRoom.topic).toBe('motors');
      expect(retrievedRoom.status).toBe('active');
    });

    it('should throw error if room not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(RoomService.getRoomById(fakeId)).rejects.toThrow(
        'Room not found'
      );
    });
  });

  describe('getRoomsByUser', () => {
    it('should retrieve all rooms for a user', async () => {
      const user3 = await User.create({
        name: 'User 3',
        email: 'user3@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const doubt3 = await Doubt.create({
        title: 'Doubt 3',
        description: 'Description 3',
        topic: 'sensors',
        tags: [],
        userId: user3._id,
        status: 'open',
      });

      // Create two rooms with user1
      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      await Room.create({
        student1: user1._id,
        student2: user3._id,
        doubt1: doubt1._id,
        doubt2: doubt3._id,
        topic: 'sensors',
        status: 'active',
      });

      const rooms = await RoomService.getRoomsByUser(user1._id);

      expect(rooms).toHaveLength(2);
    });

    it('should filter rooms by status', async () => {
      const room1 = await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      const room2 = await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'completed',
      });

      const activeRooms = await RoomService.getRoomsByUser(user1._id, {
        status: 'active',
      });

      expect(activeRooms).toHaveLength(1);
      expect(activeRooms[0]._id.toString()).toBe(room1._id.toString());
    });

    it('should support pagination', async () => {
      // Create 15 rooms
      for (let i = 0; i < 15; i++) {
        await Room.create({
          student1: user1._id,
          student2: user2._id,
          doubt1: doubt1._id,
          doubt2: doubt2._id,
          topic: 'motors',
          status: 'active',
        });
      }

      const page1 = await RoomService.getRoomsByUser(user1._id, {
        page: 1,
        limit: 10,
      });
      const page2 = await RoomService.getRoomsByUser(user1._id, {
        page: 2,
        limit: 10,
      });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(5);
    });
  });

  describe('getRoomCountByUser', () => {
    it('should return correct room count for user', async () => {
      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      const count = await RoomService.getRoomCountByUser(user1._id);

      expect(count).toBe(2);
    });

    it('should filter count by status', async () => {
      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'completed',
      });

      const activeCount = await RoomService.getRoomCountByUser(
        user1._id,
        'active'
      );

      expect(activeCount).toBe(1);
    });
  });

  describe('updateRoomStatus', () => {
    it('should update room status', async () => {
      const room = await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      const updatedRoom = await RoomService.updateRoomStatus(
        room._id,
        'completed'
      );

      expect(updatedRoom.status).toBe('completed');
    });

    it('should throw error for invalid status', async () => {
      const room = await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      await expect(
        RoomService.updateRoomStatus(room._id, 'invalid')
      ).rejects.toThrow('Invalid room status');
    });
  });

  describe('getActiveRoomsCount', () => {
    it('should return count of active rooms', async () => {
      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'completed',
      });

      const count = await RoomService.getActiveRoomsCount();

      expect(count).toBe(1);
    });
  });

  describe('getRoomsByTopic', () => {
    it('should retrieve rooms by topic', async () => {
      const user3 = await User.create({
        name: 'User 3',
        email: 'user3@test.com',
        password: await AuthService.hashPassword('password123'),
        role: 'student',
      });

      const doubt3 = await Doubt.create({
        title: 'Doubt 3',
        description: 'Description 3',
        topic: 'sensors',
        tags: [],
        userId: user3._id,
        status: 'open',
      });

      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      await Room.create({
        student1: user1._id,
        student2: user3._id,
        doubt1: doubt1._id,
        doubt2: doubt3._id,
        topic: 'sensors',
        status: 'active',
      });

      const motorRooms = await RoomService.getRoomsByTopic('motors');

      expect(motorRooms).toHaveLength(1);
      expect(motorRooms[0].topic).toBe('motors');
    });
  });

  describe('getRoomStatistics', () => {
    it('should return room statistics', async () => {
      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'active',
      });

      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'completed',
      });

      await Room.create({
        student1: user1._id,
        student2: user2._id,
        doubt1: doubt1._id,
        doubt2: doubt2._id,
        topic: 'motors',
        status: 'abandoned',
      });

      const stats = await RoomService.getRoomStatistics();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.abandoned).toBe(1);
    });
  });
});
