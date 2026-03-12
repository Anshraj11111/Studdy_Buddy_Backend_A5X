import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import authRoutes from '../../src/routes/auth.routes.js';
import doubtRoutes from '../../src/routes/doubt.routes.js';
import User from '../../src/models/User.js';
import Doubt from '../../src/models/Doubt.js';

let app;
let mongoServer;
let authToken;
let userId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create Express app
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/doubts', doubtRoutes);

  // Register and login a user
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'student',
    });

  authToken = registerResponse.body.data.token;
  userId = registerResponse.body.data.user._id;
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

afterEach(async () => {
  await Doubt.deleteMany({});
});

describe('Doubt Integration Tests', () => {
  describe('POST /api/doubts', () => {
    test('should create a new doubt successfully', async () => {
      const doubtData = {
        title: 'How to build a robot?',
        description: 'I want to learn how to build a robot from scratch',
        topic: 'robotics',
        tags: ['beginner', 'hardware'],
      };

      const response = await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(doubtData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doubt).toHaveProperty('_id');
      expect(response.body.data.doubt.title).toBe(doubtData.title);
      expect(response.body.data.doubt.status).toBe('open');
    });

    test('should reject doubt creation without authentication', async () => {
      const response = await request(app)
        .post('/api/doubts')
        .send({
          title: 'Test',
          description: 'Test',
          topic: 'test',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject doubt with missing fields', async () => {
      const response = await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          // missing description and topic
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject doubt with title exceeding 200 characters', async () => {
      const response = await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'a'.repeat(201),
          description: 'Test',
          topic: 'test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/doubts', () => {
    test('should get all doubts', async () => {
      // Create some doubts
      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Doubt 1',
          description: 'Description 1',
          topic: 'robotics',
          tags: ['beginner'],
        });

      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Doubt 2',
          description: 'Description 2',
          topic: 'ai',
          tags: ['advanced'],
        });

      const response = await request(app)
        .get('/api/doubts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doubts.length).toBe(2);
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    test('should filter doubts by topic', async () => {
      // Create doubts with different topics
      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Robotics Doubt',
          description: 'Description',
          topic: 'robotics',
        });

      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'AI Doubt',
          description: 'Description',
          topic: 'ai',
        });

      const response = await request(app)
        .get('/api/doubts?topic=robotics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doubts.length).toBe(1);
      expect(response.body.data.doubts[0].topic).toBe('robotics');
    });

    test('should support pagination', async () => {
      // Create 15 doubts
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/doubts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Doubt ${i}`,
            description: 'Description',
            topic: 'test',
          });
      }

      // Get first page with limit 10
      const response1 = await request(app)
        .get('/api/doubts?page=1&limit=10')
        .expect(200);

      expect(response1.body.data.doubts.length).toBe(10);
      expect(response1.body.data.pagination.page).toBe(1);
      expect(response1.body.data.pagination.total).toBe(15);
      expect(response1.body.data.pagination.pages).toBe(2);

      // Get second page
      const response2 = await request(app)
        .get('/api/doubts?page=2&limit=10')
        .expect(200);

      expect(response2.body.data.doubts.length).toBe(5);
      expect(response2.body.data.pagination.page).toBe(2);
    });
  });

  describe('GET /api/doubts/:id', () => {
    test('should get doubt by ID', async () => {
      // Create a doubt
      const createResponse = await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Doubt',
          description: 'Test Description',
          topic: 'robotics',
          tags: ['beginner'],
        });

      const doubtId = createResponse.body.data.doubt._id;

      // Get doubt by ID
      const response = await request(app)
        .get(`/api/doubts/${doubtId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doubt._id).toBe(doubtId);
      expect(response.body.data.doubt.title).toBe('Test Doubt');
    });

    test('should return 404 for non-existent doubt', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/doubts/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/doubts/search', () => {
    test('should search doubts by keyword', async () => {
      // Create doubts
      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'How to build a robot',
          description: 'Learn robotics basics',
          topic: 'robotics',
        });

      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'AI algorithms',
          description: 'Machine learning concepts',
          topic: 'ai',
        });

      // Search for 'robot'
      const response = await request(app)
        .get('/api/doubts/search?keyword=robot')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doubts.length).toBe(1);
      expect(response.body.data.doubts[0].title).toContain('robot');
    });

    test('should reject search without keyword', async () => {
      const response = await request(app)
        .get('/api/doubts/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/doubts/topic/:topic', () => {
    test('should get doubts by topic', async () => {
      // Create doubts
      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Robotics 1',
          description: 'Description',
          topic: 'robotics',
        });

      await request(app)
        .post('/api/doubts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Robotics 2',
          description: 'Description',
          topic: 'robotics',
        });

      const response = await request(app)
        .get('/api/doubts/topic/robotics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.doubts.length).toBe(2);
      expect(response.body.data.doubts.every(d => d.topic === 'robotics')).toBe(true);
    });
  });
});
