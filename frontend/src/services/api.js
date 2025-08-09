
import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = process.env.NODE_ENV === 'production' 
  ? `${window.location.origin}/api`
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor with retry logic
api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date() };
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with automatic retry
api.interceptors.response.use(
  (response) => {
    response.config.metadata.endTime = new Date();
    response.duration = response.config.metadata.endTime - response.config.metadata.startTime;
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${response.duration}ms)`);
    return response;
  },
  async (error) => {
    const config = error.config;
    
    // Retry logic for network errors
    if (!config || !config.retry) {
      config.retry = true;
      config.retryCount = config.retryCount || 0;
      
      if (config.retryCount < 3 && (error.code === 'NETWORK_ERROR' || error.response?.status >= 500)) {
        config.retryCount += 1;
        console.log(`🔄 Retrying request (${config.retryCount}/3): ${config.method?.toUpperCase()} ${config.url}`);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, config.retryCount) * 1000));
        return api(config);
      }
    }
    
    console.error('❌ API Response Error:', error);
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    
    // Don't show toast for certain endpoints or during retries
    const silentEndpoints = ['/health', '/metrics'];
    const shouldShowToast = !silentEndpoints.some(endpoint => 
      error.config?.url?.includes(endpoint)
    ) && !config?.retryCount;
    
    if (shouldShowToast) {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

// Enhanced API methods with caching
const cache = new Map();
const getCached = (key, ttl = 30000) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Health check with caching
export const healthCheck = async (useCache = true) => {
  const cacheKey = 'health';
  if (useCache) {
    const cached = getCached(cacheKey, 5000); // 5 second cache
    if (cached) return cached;
  }
  
  try {
    const response = await api.get('/health');
    setCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Configuration
export const getConfig = () => api.get('/config');
export const updateConfig = (updates) => api.post('/config', { updates });

// OpenRouter API Keys
export const getOpenRouterKeys = () => api.get('/openrouter/keys');
export const updateOpenRouterKeys = (keys) => api.post('/openrouter/keys', { keys });

// Models with caching
export const getModels = async (useCache = true) => {
  const cacheKey = 'models';
  if (useCache) {
    const cached = getCached(cacheKey, 60000); // 1 minute cache
    if (cached) return cached;
  }
  
  try {
    const response = await api.get('/models');
    setCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const refreshModels = async () => {
  cache.delete('models'); // Clear cache
  const response = await api.get('/models/refresh');
  setCache('models', response.data);
  return response.data;
};

// Tasks with real-time updates
export const getTasks = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return api.get(`/tasks${params ? `?${params}` : ''}`);
};

export const createTask = (task) => api.post('/tasks', task);
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);
export const updateTask = (taskId, updates) => api.put(`/tasks/${taskId}`, updates);

// Agents
export const getAgents = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return api.get(`/agents${params ? `?${params}` : ''}`);
};

export const createAgent = (agent) => api.post('/agents', agent);
export const updateAgent = (agentId, updates) => api.put(`/agents/${agentId}`, updates);
export const deleteAgent = (agentId) => api.delete(`/agents/${agentId}`);

// Enhanced metrics with real-time data
export const getMetrics = async (useCache = true) => {
  const cacheKey = 'metrics';
  if (useCache) {
    const cached = getCached(cacheKey, 10000); // 10 second cache
    if (cached) return cached;
  }
  
  try {
    const response = await api.get('/metrics');
    setCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Provider health
export const getProviderHealth = () => api.get('/providers/health');

// System operations
export const getSystemStatus = () => api.get('/system/status');
export const restartSystem = () => api.post('/system/restart');
export const getSystemLogs = (level = 'info', limit = 100) => 
  api.get(`/system/logs?level=${level}&limit=${limit}`);

// Analytics and reporting
export const getAnalytics = (timeRange = '24h') => api.get(`/analytics?range=${timeRange}`);
export const exportData = (type, format = 'json') => api.get(`/export/${type}?format=${format}`);

// Batch operations
export const batchCreateTasks = (tasks) => api.post('/tasks/batch', { tasks });
export const batchDeleteTasks = (taskIds) => api.delete('/tasks/batch', { data: { taskIds } });

// WebSocket connection helper
export const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = process.env.NODE_ENV === 'production' 
    ? window.location.host 
    : 'localhost:8001';
  return `${protocol}//${host}`;
};

// Utility functions
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error);
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  } else if (error.message) {
    return error.message;
  } else {
    return defaultMessage;
  }
};

export const formatApiResponse = (response, key = 'data') => {
  return response?.data?.[key] || response?.data || null;
};

// Clear cache utility
export const clearCache = (keys = []) => {
  if (keys.length === 0) {
    cache.clear();
  } else {
    keys.forEach(key => cache.delete(key));
  }
};

// Export the axios instance for direct use if needed
export default api;
