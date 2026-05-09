import { createClient } from 'redis';

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) return false // Stop retrying after 3 attempts
          return Math.min(retries * 100, 1000)
        },
        connectTimeout: 3000, // 3s timeout - fail fast
      },
    });

    redisClient.on('error', () => {
      // Silently handle - Redis is optional
      redisClient = null;
    });

    redisClient.on('ready', () => {
      console.log('✓ Redis Connected');
    });

    // Use Promise.race to not block if Redis is slow
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000))
    ]);

    return redisClient;
  } catch (error) {
    console.warn('⚠ Redis unavailable - running without cache');
    redisClient = null;
    return null;
  }
};

const getRedisClient = () => redisClient;

const disconnectRedis = async () => {
  if (redisClient) {
    try { await redisClient.quit() } catch {}
    redisClient = null;
  }
};

export { connectRedis, getRedisClient, disconnectRedis };
export default connectRedis;
