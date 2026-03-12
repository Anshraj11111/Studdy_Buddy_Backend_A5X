import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import User from '../../src/models/User.js';
import Doubt from '../../src/models/Doubt.js';
import Room from '../../src/models/Room.js';
import authService from '../../src/services/auth.service.js';
import doubtController from '../../src/controllers/doubt.controller.js';
import authMiddleware from '../../src/middleware/auth.middleware.js';

let mongoServer;
let app;
let user1Token;
let user2Token;
let user1Id;
let user2Id;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create Express app for testing
  app = express();
  app.use(express.json());

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      const user = await authService.register({
        name,
        email,
        password,
        role,
      });
      const token = authService.generateToken(user._id);
      res.status(201).json({
        success: true,
        data: { user, token },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password);
      res.status(200).json({
        success: true,
        data: { user, token },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  });

  // Doubt routes
  app.post('/api/doubts', authMiddleware.authenticate, doubtController.createDoubt);
  app.get('/api/doubts', doubtController.getDoubts);

  // Register two users
  const res1 = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'User 1',
      email: 'user1@test.com',
      password: 'password123',
      role: 'student',
    });

  user1Token = res1.body.data.token;
  user1Id = res1.body.data.user._id;

  const res2 = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'User 2',
      email: 'user2@test.com',
      password: 'password123',
      role: 'student',
    });

  user2Token = res2.body.data.token;
  user2Id = res2.body.data.user._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Doubt.deleteMany({});
  await Room.deleteMany({});
});

describe('Matching Integration Tests', () => {
  it('should create a room when two doubts with same topic are posted', async () => {
    // User 1 creates a doubt
    const res1 = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'How to use motors?',
        description: 'I need help with motors',
        topic: 'motors',
        tags: ['robotics'],
      });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.doubt).toBeDefined();
    expect(res1.body.data.matched).toBe(false);
    expect(res1.body.data.room).toBeNull();

    // User 2 creates a doubt with same topic
    const res2 = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        title: 'Motor control',
        description: 'How to control motors?',
        topic: 'motors',
        tags: ['robotics'],
      });

    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.matched).toBe(true);
    expect(res2.body.data.room).toBeDefined();
    expect(res2.body.data.room.topic).toBe('motors');
    expect(res2.body.data.room.status).toBe('active');

    // Verify room was created in database
    const room = await Room.findById(res2.body.data.room._id);
    expect(room).toBeDefined();
    expect(room.student1.toString()).toBe(user1Id);
    expect(room.student2.toString()).toBe(user2Id);

    // Verify both doubts are marked as matched
    const doubt1 = await Doubt.findById(res1.body.data.doubt._id);
    const doubt2 = await Doubt.findById(res2.body.data.doubt._id);
    expect(doubt1.status).toBe('matched');
    expect(doubt2.status).toBe('matched');
  });

  it('should not create a room when doubts have different topics', async () => {
    // User 1 creates a doubt with topic "motors"
    const res1 = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'How to use motors?',
        description: 'I need help with motors',
        topic: 'motors',
        tags: ['robotics'],
      });

    expect(res1.body.data.matched).toBe(false);

    // User 2 creates a doubt with different topic "sensors"
    const res2 = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        title: 'How to use sensors?',
        description: 'I need help with sensors',
        topic: 'sensors',
        tags: ['robotics'],
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.matched).toBe(false);
    expect(res2.body.data.room).toBeNull();

    // Verify no room was created
    const rooms = await Room.find({});
    expect(rooms).toHaveLength(0);

    // Verify both doubts are still open
    const doubt1 = await Doubt.findById(res1.body.data.doubt._id);
    const doubt2 = await Doubt.findById(res2.body.data.doubt._id);
    expect(doubt1.status).toBe('open');
    expect(doubt2.status).toBe('open');
  });

  it('should match multiple doubts sequentially', async () => {
    // User 1 creates first doubt
    const res1 = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Doubt 1',
        description: 'Description 1',
        topic: 'motors',
        tags: [],
      });

    expect(res1.body.data.matched).toBe(false);

    // User 2 creates second doubt with same topic
    const res2 = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        title: 'Doubt 2',
        description: 'Description 2',
        topic: 'motors',
        tags: [],
      });

    expect(res2.body.data.matched).toBe(true);
    expect(res2.body.data.room).toBeDefined();

    // Verify room was created
    const rooms = await Room.find({});
    expect(rooms).toHaveLength(1);
    expect(rooms[0].topic).toBe('motors');
  });

  it('should return room details in response when match is found', async () => {
    // User 1 creates a doubt
    const res1 = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'How to use motors?',
        description: 'I need help with motors',
        topic: 'motors',
        tags: ['robotics'],
      });

    // User 2 creates a doubt with same topic
    const res2 = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        title: 'Motor control',
        description: 'How to control motors?',
        topic: 'motors',
        tags: ['robotics'],
      });

    // Verify room details in response
    expect(res2.body.data.room).toHaveProperty('_id');
    expect(res2.body.data.room).toHaveProperty('student1');
    expect(res2.body.data.room).toHaveProperty('student2');
    expect(res2.body.data.room).toHaveProperty('doubt1');
    expect(res2.body.data.room).toHaveProperty('doubt2');
    expect(res2.body.data.room).toHaveProperty('topic');
    expect(res2.body.data.room).toHaveProperty('status');
    expect(res2.body.data.room).toHaveProperty('createdAt');
  });
});
