import { createClient } from 'redis';

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Redis: Max reconnection attempts reached');
          }
          // Exponential backoff: 50ms, 100ms, 200ms, etc.
          const delay = Math.min(retries * 50, 3000);
          console.log(`Redis: Reconnecting in ${delay}ms...`);
          return delay;
        },
        connectTimeout: 10000,
      },
    });

    // Event handlers
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      console.log('Redis: Connected and ready 🚀');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis: Reconnecting...');
    });

    redisClient.on('end', () => {
      console.log('Redis: Connection closed');
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error(`Redis connection failed: ${error.message}`);
    console.warn('Application will continue without Redis caching');
    return null;
  }
};

const getRedisClient = () => {
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

export { connectRedis, getRedisClient, disconnectRedis };
export default connectRedis;
