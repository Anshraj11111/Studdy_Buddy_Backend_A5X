import redis from '../config/redis.js';

class CacheService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or null
   */
  async get(key) {
    try {
      if (!redis || redis.status !== 'ready') {
        return null;
      }

      const value = await redis.get(key);
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 3600)
   * @returns {boolean} - Success status
   */
  async set(key, value, ttl = 3600) {
    try {
      if (!redis || redis.status !== 'ready') {
        return false;
      }

      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} - Success status
   */
  async del(key) {
    try {
      if (!redis || redis.status !== 'ready') {
        return false;
      }

      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} - Existence status
   */
  async exists(key) {
    try {
      if (!redis || redis.status !== 'ready') {
        return false;
      }

      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   * @returns {boolean} - Success status
   */
  async clear() {
    try {
      if (!redis || redis.status !== 'ready') {
        return false;
      }

      await redis.flushdb();
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   * @param {Array} keys - Array of cache keys
   * @returns {Object} - Object with key-value pairs
   */
  async mget(keys) {
    try {
      if (!redis || redis.status !== 'ready') {
        return {};
      }

      const values = await redis.mget(keys);
      const result = {};

      keys.forEach((key, index) => {
        if (values[index]) {
          try {
            result[key] = JSON.parse(values[index]);
          } catch {
            result[key] = values[index];
          }
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting multiple values from cache:', error);
      return {};
    }
  }

  /**
   * Set multiple values in cache
   * @param {Object} data - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   * @returns {boolean} - Success status
   */
  async mset(data, ttl = 3600) {
    try {
      if (!redis || redis.status !== 'ready') {
        return false;
      }

      const pipeline = redis.pipeline();

      Object.entries(data).forEach(([key, value]) => {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        pipeline.setex(key, ttl, serialized);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Error setting multiple values in cache:', error);
      return false;
    }
  }

  /**
   * Increment a counter in cache
   * @param {string} key - Cache key
   * @param {number} increment - Amount to increment (default: 1)
   * @returns {number} - New value
   */
  async incr(key, increment = 1) {
    try {
      if (!redis || redis.status !== 'ready') {
        return 0;
      }

      const value = await redis.incrby(key, increment);
      return value;
    } catch (error) {
      console.error('Error incrementing cache value:', error);
      return 0;
    }
  }

  /**
   * Decrement a counter in cache
   * @param {string} key - Cache key
   * @param {number} decrement - Amount to decrement (default: 1)
   * @returns {number} - New value
   */
  async decr(key, decrement = 1) {
    try {
      if (!redis || redis.status !== 'ready') {
        return 0;
      }

      const value = await redis.decrby(key, decrement);
      return value;
    } catch (error) {
      console.error('Error decrementing cache value:', error);
      return 0;
    }
  }
}

export default new CacheService();
