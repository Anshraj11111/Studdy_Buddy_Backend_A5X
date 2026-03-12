import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import connectRedis from './src/config/redis.js';
import setupChatSocket from './src/sockets/chat.socket.js';
import setupVideoSocket from './src/sockets/video.socket.js';
import logger from './src/utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with Redis adapter for clustering
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6, // 1MB
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Setup socket handlers
setupChatSocket(io);
setupVideoSocket(io);

// Connect to databases and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✓ MongoDB connected');

    // Connect to Redis
    await connectRedis;
    logger.info('✓ Redis connected');

    // Setup Socket.IO Redis adapter for clustering
    try {
      const redisClient = (await import('./src/config/redis.js')).default;
      if (redisClient && redisClient.status === 'ready') {
        io.adapter(createAdapter(redisClient, redisClient.duplicate()));
        logger.info('✓ Socket.IO Redis adapter configured');
      }
    } catch (error) {
      logger.warn('Socket.IO Redis adapter not available, using default adapter', {
        error: error.message,
      });
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT}`);
      logger.info(`✓ Socket.IO initialized`);
      logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});