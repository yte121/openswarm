import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    
    // Don't show toast for certain endpoints
    const silentEndpoints = ['/health', '/metrics'];
    const shouldShowToast = !silentEndpoints.some(endpoint => 
      error.config?.url?.includes(endpoint)
    );
    
    if (shouldShowToast) {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

// Health check
export const healthCheck = () => api.get('/health');

// Configuration
export const getConfig = () => api.get('/config');
export const updateConfig = (updates) => api.post('/config', { updates });

// OpenRouter API Keys
export const getOpenRouterKeys = () => api.get('/openrouter/keys');
export const updateOpenRouterKeys = (keys) => api.post('/openrouter/keys', { keys });

// Models
export const getModels = () => api.get('/models');
export const refreshModels = () => api.get('/models/refresh');

// Tasks
export const getTasks = () => api.get('/tasks');
export const createTask = (task) => api.post('/tasks', task);
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);

// Agents
export const getAgents = () => api.get('/agents');

// Metrics
export const getMetrics = () => api.get('/metrics');

// Provider health
export const getProviderHealth = () => api.get('/providers/health');

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

// Export the axios instance for direct use if needed
export default api;
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://0.0.0.0:8001/api' 
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API methods
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getModels = async () => {
  try {
    const response = await api.get('/models');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTasks = async () => {
  try {
    const response = await api.get('/tasks');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAgents = async () => {
  try {
    const response = await api.get('/agents');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getSystemStatus = async () => {
  try {
    const response = await api.get('/system/status');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
