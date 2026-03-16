import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import doubtRoutes from './routes/doubt.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import communityRoutes from './routes/community.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import roomRoutes from './routes/room.routes.js';
import feedRoutes from './routes/feed.routes.js';
import connectionRoutes from './routes/connection.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import logger from './utils/logger.js';

const app = express();

// Compression middleware
app.use(compression());

// Security middleware
app.use(helmet());

// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'https://studdy-buddy-a5x.vercel.app',
        'https://studdy-buddy-backend-a5x.onrender.com',
        /https:\/\/studdy-buddy.*\.vercel\.app$/, // Allow all Vercel preview URLs
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
        console.log('CORS blocked origin:', origin);
        callback(null, true); // Temporarily allow all for debugging
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware with size limits
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting - TEMPORARILY DISABLED FOR TESTING
// app.use('/api/', limiter);
// app.use('/api/auth/', authLimiter);

// Health check routes
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health/db', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const mongooseConnection = mongoose.connection;
    if (mongooseConnection.readyState === 1) {
      res.status(200).json({
        success: true,
        message: 'Database is healthy',
        database: 'MongoDB',
        readyState: mongooseConnection.readyState,
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Database connection failed',
        readyState: mongooseConnection.readyState,
      });
    }
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error.message,
    });
  }
});

app.get('/health/redis', async (req, res) => {
  try {
    const redis = (await import('../config/redis.js')).default;
    if (redis && redis.status === 'ready') {
      res.status(200).json({
        success: true,
        message: 'Redis is healthy',
        cache: 'Redis',
        status: redis.status,
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Redis connection failed',
        status: redis?.status || 'unknown',
      });
    }
  } catch (error) {
    logger.error('Redis health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      message: 'Redis health check failed',
      error: error.message,
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
