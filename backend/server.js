const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const { configManager } = require('../claude/src/core/config.js');
const { ProviderManager } = require('../claude/src/providers/provider-manager.js');
const { TaskExecutor } = require('../claude/src/swarm/executor.js');

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Global state management
class DashboardState {
  constructor() {
    this.clients = new Set();
    this.providerManager = null;
    this.taskExecutor = null;
    this.activeTasks = new Map();
    this.agents = new Map();
    this.models = [];
    this.systemMetrics = {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalAgents: 0,
      activeAgents: 0
    };
  }

  addClient(ws) {
    this.clients.add(ws);
    console.log(`WebSocket client connected. Total clients: ${this.clients.size}`);
  }

  removeClient(ws) {
    this.clients.delete(ws);
    console.log(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
  }

  broadcast(type, data) {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async initialize() {
    try {
      // Initialize configuration
      await configManager.init();
      
      // Initialize provider manager with OpenRouter
      const config = {
        providers: {
          openrouter: {
            apiKey: process.env.OPENROUTER_API_KEYS || '',
            apiUrl: 'https://openrouter.ai/api/v1',
            model: 'openrouter/auto'
          }
        },
        loadBalancing: {
          strategy: 'round-robin'
        },
        fallback: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000
        }
      };

      this.providerManager = new ProviderManager(config);
      await this.providerManager.initialize();

      // Initialize task executor
      this.taskExecutor = new TaskExecutor({
        timeoutMs: 300000, // 5 minutes
        retryAttempts: 3,
        logLevel: 'info',
        streamOutput: true,
        enableMetrics: true
      });
      await this.taskExecutor.initialize();

      // Load available models
      await this.loadModels();

      console.log('✅ Dashboard state initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize dashboard state:', error);
      throw error;
    }
  }

  async loadModels() {
    try {
      if (this.providerManager) {
        this.models = await this.providerManager.getAvailableModels();
        this.broadcast('models_updated', this.models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }
}

const dashboardState = new DashboardState();

// WebSocket connection handling
wss.on('connection', (ws) => {
  dashboardState.addClient(ws);

  // Send initial data
  ws.send(JSON.stringify({
    type: 'connection_established',
    data: {
      models: dashboardState.models,
      activeTasks: Array.from(dashboardState.activeTasks.values()),
      agents: Array.from(dashboardState.agents.values()),
      metrics: dashboardState.systemMetrics
    }
  }));

  ws.on('close', () => {
    dashboardState.removeClient(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    dashboardState.removeClient(ws);
  });
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0-alpha.84'
  });
});

// Configuration management
app.get('/api/config', async (req, res) => {
  try {
    const config = configManager.getSecure();
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const { updates } = req.body;
    const updatedConfig = configManager.update(updates, {
      source: 'api',
      user: 'dashboard'
    });
    
    // Restart provider manager if credentials changed
    if (updates.credentials) {
      await dashboardState.providerManager.shutdown();
      await dashboardState.initialize();
    }
    
    res.json({ success: true, config: updatedConfig });
    dashboardState.broadcast('config_updated', updatedConfig);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// OpenRouter API Keys management
app.get('/api/openrouter/keys', (req, res) => {
  const keys = process.env.OPENROUTER_API_KEYS || '';
  const keyList = keys.split(',').map(key => key.trim()).filter(key => key);
  res.json({ 
    success: true, 
    keys: keyList.map((key, index) => ({
      id: index,
      key: key.substring(0, 8) + '...' + key.substring(key.length - 4),
      status: 'active' // TODO: Implement actual health check
    }))
  });
});

app.post('/api/openrouter/keys', async (req, res) => {
  try {
    const { keys } = req.body;
    
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ success: false, error: 'Keys must be a non-empty array' });
    }

    // Update environment variable (in production, this should be persisted)
    process.env.OPENROUTER_API_KEYS = keys.join(',');
    
    // Reinitialize provider manager
    await dashboardState.providerManager.shutdown();
    await dashboardState.initialize();
    
    res.json({ success: true, message: `Updated ${keys.length} OpenRouter API keys` });
    dashboardState.broadcast('keys_updated', { count: keys.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Models management
app.get('/api/models', (req, res) => {
  res.json({ 
    success: true, 
    models: dashboardState.models,
    count: dashboardState.models.length 
  });
});

app.get('/api/models/refresh', async (req, res) => {
  try {
    await dashboardState.loadModels();
    res.json({ 
      success: true, 
      models: dashboardState.models,
      count: dashboardState.models.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tasks management
app.get('/api/tasks', (req, res) => {
  const tasks = Array.from(dashboardState.activeTasks.values());
  res.json({ success: true, tasks, count: tasks.length });
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { name, description, instructions, model, priority = 'normal' } = req.body;
    
    if (!name || !description || !instructions) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, description, and instructions are required' 
      });
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task = {
      id: { id: taskId, swarmId: 'dashboard_swarm' },
      name,
      description,
      instructions,
      type: 'user_request',
      priority,
      status: 'created',
      created: new Date().toISOString(),
      model: model || 'openrouter/auto',
      context: {},
      input: {},
      requirements: {
        tools: [],
        minReliability: 0.8
      },
      constraints: {
        timeoutAfter: 300000,
        maxRetries: 3
      }
    };

    const agent = {
      id: { id: `agent_${taskId}`, swarmId: 'dashboard_swarm' },
      name: `Agent for ${name}`,
      type: 'general',
      status: 'idle',
      capabilities: {
        codeGeneration: true,
        textAnalysis: true,
        problemSolving: true
      },
      environment: {
        credentials: {}
      }
    };

    dashboardState.activeTasks.set(taskId, { ...task, agent });
    dashboardState.agents.set(agent.id.id, agent);
    dashboardState.systemMetrics.totalTasks++;
    dashboardState.systemMetrics.activeTasks++;
    
    // Broadcast update
    dashboardState.broadcast('task_created', { task: { ...task, agent } });
    
    res.json({ success: true, task: { ...task, agent } });
    
    // Execute task asynchronously
    executeTaskAsync(taskId, task, agent);
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  if (dashboardState.activeTasks.has(taskId)) {
    const task = dashboardState.activeTasks.get(taskId);
    dashboardState.activeTasks.delete(taskId);
    dashboardState.systemMetrics.activeTasks = Math.max(0, dashboardState.systemMetrics.activeTasks - 1);
    
    dashboardState.broadcast('task_deleted', { taskId });
    res.json({ success: true, message: 'Task deleted' });
  } else {
    res.status(404).json({ success: false, error: 'Task not found' });
  }
});

// Agents management
app.get('/api/agents', (req, res) => {
  const agents = Array.from(dashboardState.agents.values());
  res.json({ success: true, agents, count: agents.length });
});

// System metrics
app.get('/api/metrics', (req, res) => {
  const metrics = {
    ...dashboardState.systemMetrics,
    providerHealth: dashboardState.providerManager ? 'healthy' : 'unavailable',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
  
  res.json({ success: true, metrics });
});

// Provider health
app.get('/api/providers/health', async (req, res) => {
  try {
    const health = await dashboardState.providerManager.getHealthStatus();
    res.json({ success: true, health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute task asynchronously
async function executeTaskAsync(taskId, task, agent) {
  try {
    const taskData = dashboardState.activeTasks.get(taskId);
    if (!taskData) return;

    // Update task status
    taskData.status = 'running';
    taskData.startedAt = new Date().toISOString();
    dashboardState.broadcast('task_updated', { taskId, updates: { status: 'running', startedAt: taskData.startedAt } });

    // Mock execution - in real implementation, this would use TaskExecutor
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Simulate result
    const success = Math.random() > 0.2; // 80% success rate
    
    taskData.status = success ? 'completed' : 'failed';
    taskData.completedAt = new Date().toISOString();
    taskData.result = success ? 
      { output: 'Task completed successfully', artifacts: {} } :
      { error: 'Task execution failed', details: 'Simulated failure for demo' };

    if (success) {
      dashboardState.systemMetrics.completedTasks++;
    } else {
      dashboardState.systemMetrics.failedTasks++;
    }
    
    dashboardState.systemMetrics.activeTasks = Math.max(0, dashboardState.systemMetrics.activeTasks - 1);

    dashboardState.broadcast('task_updated', { 
      taskId, 
      updates: { 
        status: taskData.status, 
        completedAt: taskData.completedAt, 
        result: taskData.result 
      } 
    });

    // Clean up completed tasks after 1 hour
    setTimeout(() => {
      dashboardState.activeTasks.delete(taskId);
      dashboardState.agents.delete(agent.id.id);
      dashboardState.broadcast('task_cleaned_up', { taskId });
    }, 3600000);

  } catch (error) {
    console.error(`Task ${taskId} execution error:`, error);
    const taskData = dashboardState.activeTasks.get(taskId);
    if (taskData) {
      taskData.status = 'failed';
      taskData.error = error.message;
      dashboardState.systemMetrics.failedTasks++;
      dashboardState.systemMetrics.activeTasks = Math.max(0, dashboardState.systemMetrics.activeTasks - 1);
      dashboardState.broadcast('task_updated', { taskId, updates: { status: 'failed', error: error.message } });
    }
  }
}

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    details: error.message 
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🚀 Initializing Claude-Flow Dashboard...');
    
    // Initialize dashboard state
    await dashboardState.initialize();
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Claude-Flow Dashboard running on http://localhost:${PORT}`);
      console.log(`🔗 WebSocket server running on ws://localhost:${PORT}`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
    });

    // Periodic metrics updates
    setInterval(() => {
      dashboardState.broadcast('metrics_updated', dashboardState.systemMetrics);
    }, 5000);

    // Periodic model refresh (every 30 minutes)
    setInterval(async () => {
      try {
        await dashboardState.loadModels();
      } catch (error) {
        console.error('Failed to refresh models:', error);
      }
    }, 30 * 60 * 1000);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  if (dashboardState.providerManager) {
    await dashboardState.providerManager.shutdown();
  }
  
  if (dashboardState.taskExecutor) {
    await dashboardState.taskExecutor.shutdown();
  }
  
  wss.close();
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  if (dashboardState.providerManager) {
    await dashboardState.providerManager.shutdown();
  }
  
  if (dashboardState.taskExecutor) {
    await dashboardState.taskExecutor.shutdown();
  }
  
  wss.close();
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, dashboardState };