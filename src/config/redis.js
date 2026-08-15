import { createClient } from 'redis';

let redisClient = null;

const connectRedis = async () => {
  try {
    // For production with 10K users, use Redis for:
    // 1. Session storage
    // 2. Socket.IO adapter (multi-server)
    // 3. Rate limiting
    // 4. Caching frequent queries
    
    const redisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.warn('⚠️ Redis reconnection failed after 5 attempts');
            return false; // Stop retrying
          }
          return Math.min(retries * 200, 2000); // Exponential backoff
        },
        connectTimeout: 5000,        // 5s timeout
        keepAlive: 30000,            // Keep connection alive
        noDelay: true,               // Disable Nagle's algorithm (lower latency)
      },
      // ── Performance Options ──────────────────────────────────────────────
      commandsQueueMaxLength: 1000,  // Max queued commands
      disableOfflineQueue: true,     // Fail fast if not connected
    };

    // Use free Redis hosting for production:
    // 1. Upstash Redis (FREE 10K commands/day)
    // 2. Redis Cloud (FREE 30MB)
    // 3. Railway Redis (FREE 100MB)
    
    redisClient = createClient(redisConfig);

    redisClient.on('error', (err) => {
      console.warn('⚠️ Redis error (continuing without cache):', err.message);
      redisClient = null;
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis Connected - Caching enabled for 10K users!');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Try to connect with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
    ]);

    return redisClient;
  } catch (error) {
    console.warn('⚠️ Redis unavailable - running without cache (performance may be slower)');
    console.warn('💡 For 10K users, consider adding free Redis from:');
    console.warn('   - Upstash: https://upstash.com (10K commands/day FREE)');
    console.warn('   - Redis Cloud: https://redis.com (30MB FREE)');
    redisClient = null;
    return null;
  }
};

const getRedisClient = () => redisClient;

const disconnectRedis = async () => {
  if (redisClient) {
    try { 
      await redisClient.quit();
      console.log('✓ Redis disconnected');
    } catch (err) {
      console.warn('⚠️ Error disconnecting Redis:', err.message);
    }
    redisClient = null;
  }
};

// ── Helper Functions for 10K Users ───────────────────────────────────────

/**
 * Cache data with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 */
export const setCache = async (key, value, ttl = 300) => {
  if (!redisClient) return false;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('⚠️ Cache set failed:', err.message);
    return false;
  }
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null
 */
export const getCache = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('⚠️ Cache get failed:', err.message);
    return null;
  }
};

/**
 * Delete cached data
 * @param {string} key - Cache key
 */
export const deleteCache = async (key) => {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn('⚠️ Cache delete failed:', err.message);
    return false;
  }
};

/**
 * Clear all cache (use with caution!)
 */
export const clearAllCache = async () => {
  if (!redisClient) return false;
  try {
    await redisClient.flushAll();
    console.log('🗑️ All cache cleared');
    return true;
  } catch (err) {
    console.warn('⚠️ Cache clear failed:', err.message);
    return false;
  }
};

export { connectRedis, getRedisClient, disconnectRedis };
export default connectRedis;
