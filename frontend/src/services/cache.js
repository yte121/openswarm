// Enhanced caching service for frontend optimization

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time to live tracking
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
    this.maxSize = 100; // Maximum cache entries
    this.hits = 0;
    this.misses = 0;
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  // Set cache entry with optional TTL
  set(key, value, ttl = this.defaultTTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });

    this.ttl.set(key, Date.now() + ttl);
    
    return this;
  }

  // Get cache entry
  get(key) {
    const entry = this.cache.get(key);
    const expiry = this.ttl.get(key);

    if (!entry || (expiry && Date.now() > expiry)) {
      this.misses++;
      this.delete(key);
      return null;
    }

    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.hits++;

    return entry.value;
  }

  // Check if key exists and is not expired
  has(key) {
    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  // Delete cache entry
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
    return this;
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.ttl.clear();
    this.hits = 0;
    this.misses = 0;
    return this;
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        createdAt: entry.createdAt,
        lastAccessed: entry.lastAccessed,
        accessCount: entry.accessCount,
        size: this.estimateSize(entry.value)
      }))
    };
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, expiry] of this.ttl.entries()) {
      if (expiry && now > expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
    
    return expiredKeys.length;
  }

  // Estimate memory size of cached value
  estimateSize(value) {
    if (typeof value === 'string') {
      return value.length * 2; // 2 bytes per character
    } else if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    } else {
      return 8; // Rough estimate for primitives
    }
  }

  // Get cache keys sorted by various criteria
  getKeys(sortBy = 'lastAccessed') {
    const entries = Array.from(this.cache.entries());
    
    entries.sort(([, a], [, b]) => {
      switch (sortBy) {
        case 'createdAt':
          return b.createdAt - a.createdAt;
        case 'accessCount':
          return b.accessCount - a.accessCount;
        case 'lastAccessed':
        default:
          return b.lastAccessed - a.lastAccessed;
      }
    });

    return entries.map(([key]) => key);
  }

  // Cache with promise (useful for API calls)
  async cachePromise(key, promiseFactory, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await promiseFactory();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      // Don't cache errors, just throw
      throw error;
    }
  }

  // Set cache size limit
  setMaxSize(size) {
    this.maxSize = size;
    
    // Remove excess entries if needed
    while (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
    }
    
    return this;
  }

  // Export cache data
  export() {
    const data = {};
    for (const [key, entry] of this.cache.entries()) {
      const expiry = this.ttl.get(key);
      if (!expiry || Date.now() < expiry) {
        data[key] = {
          value: entry.value,
          ttl: expiry - Date.now()
        };
      }
    }
    return data;
  }

  // Import cache data
  import(data) {
    for (const [key, entry] of Object.entries(data)) {
      if (entry.ttl && entry.ttl > 0) {
        this.set(key, entry.value, entry.ttl);
      }
    }
    return this;
  }

  // Destroy cache service
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create global cache instance
const cacheService = new CacheService();

// Cache key generators
export const cacheKeys = {
  models: () => 'models',
  tasks: (filters = {}) => `tasks:${JSON.stringify(filters)}`,
  agents: (filters = {}) => `agents:${JSON.stringify(filters)}`,
  metrics: () => 'metrics',
  health: () => 'health',
  config: () => 'config',
  providerHealth: () => 'provider_health',
  taskDetails: (taskId) => `task:${taskId}`,
  agentDetails: (agentId) => `agent:${agentId}`,
  search: (query, type) => `search:${type}:${query}`,
  analytics: (timeRange) => `analytics:${timeRange}`
};

// Cache decorators for API calls
export const withCache = (key, ttl) => (target, propertyName, descriptor) => {
  const method = descriptor.value;
  
  descriptor.value = async function (...args) {
    const cacheKey = typeof key === 'function' ? key(...args) : key;
    
    return cacheService.cachePromise(
      cacheKey,
      () => method.apply(this, args),
      ttl
    );
  };
  
  return descriptor;
};

// React hook for caching
export const useCache = () => {
  return {
    get: (key) => cacheService.get(key),
    set: (key, value, ttl) => cacheService.set(key, value, ttl),
    has: (key) => cacheService.has(key),
    delete: (key) => cacheService.delete(key),
    clear: () => cacheService.clear(),
    stats: () => cacheService.getStats(),
    cachePromise: (key, promiseFactory, ttl) => cacheService.cachePromise(key, promiseFactory, ttl)
  };
};

// Middleware for automatic caching of API responses
export const cacheMiddleware = {
  request: (config) => {
    // Add cache headers for GET requests
    if (config.method === 'get') {
      config.headers = {
        ...config.headers,
        'Cache-Control': 'max-age=300', // 5 minutes
      };
    }
    return config;
  },
  
  response: (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = `api:${response.config.url}:${JSON.stringify(response.config.params || {})}`;
      cacheService.set(cacheKey, response.data, 5 * 60 * 1000); // 5 minutes
    }
    return response;
  },
  
  error: (error) => {
    // Don't cache error responses
    return Promise.reject(error);
  }
};

export { cacheService };
export default cacheService;
class CacheService {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expireTime = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expireTime
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expireTime) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireTime) {
        this.cache.delete(key);
      }
    }
  }
}

export default new CacheService();
