/**
 * In-memory LRU cache with TTL support.
 * Works without Redis — fast, zero deps, resets on server restart.
 * Good for ~50-100 concurrent users on free tier.
 */

const MAX_ENTRIES = 500; // max keys to prevent memory bloat

class MemoryCache {
  constructor() {
    this._store = new Map(); // key → { value, expiresAt }
  }

  _isExpired(entry) {
    return entry.expiresAt && Date.now() > entry.expiresAt;
  }

  _evictIfNeeded() {
    if (this._store.size >= MAX_ENTRIES) {
      // Delete the oldest 20% entries
      const toDelete = Math.floor(MAX_ENTRIES * 0.2);
      let count = 0;
      for (const key of this._store.keys()) {
        if (count++ >= toDelete) break;
        this._store.delete(key);
      }
    }
  }

  async get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (this._isExpired(entry)) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttl = 300) {
    this._evictIfNeeded();
    this._store.set(key, {
      value,
      expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : null,
    });
    return true;
  }

  async del(key) {
    this._store.delete(key);
    return true;
  }

  async exists(key) {
    const entry = this._store.get(key);
    if (!entry) return false;
    if (this._isExpired(entry)) { this._store.delete(key); return false; }
    return true;
  }

  async clear() {
    this._store.clear();
    return true;
  }

  // Delete all keys matching a prefix pattern (e.g. 'doubts:*')
  async delPattern(prefix) {
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) this._store.delete(key);
    }
    return true;
  }

  get size() { return this._store.size; }
}

export default new MemoryCache();
