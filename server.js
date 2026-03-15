import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import mongoose from 'mongoose';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import connectRedis from './src/config/redis.js';
import setupChatSocket from './src/sockets/chat.socket.js';
import setupVideoSocket from './src/sockets/video.socket.js';
import logger from './src/utils/logger.js';

dotenv.config();

// Suppress mongoose warnings
mongoose.set('strictQuery', false);

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with proper CORS for production
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'https://studdy-buddy-a5x.vercel.app',
        /https:\/\/studdy-buddy.*\.vercel\.app$/, // All Vercel preview URLs
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('Socket CORS blocked origin:', origin);
        callback(null, true); // Temporarily allow all for debugging
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Enable compatibility with older clients
  maxHttpBufferSize: 1e6, // 1MB
  pingInterval: 25000,
  pingTimeout: 60000,
  connectTimeout: 45000,
});

// Setup socket handlers
setupChatSocket(io);
setupVideoSocket(io);

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// Connect to databases and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    await connectRedis;
    console.log('✓ Redis Connected');

    // Start server
    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
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