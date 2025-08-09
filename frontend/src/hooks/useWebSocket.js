import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [models, setModels] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalAgents: 0,
    activeAgents: 0
  });

  const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8001';

  const connect = useCallback(() => {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    setConnectionStatus('reconnecting');
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnectionStatus('connected');
      setWs(websocket);
      toast.success('Connected to Claude-Flow Dashboard');
    };

    websocket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnectionStatus('disconnected');
      setWs(null);
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (connectionStatus !== 'connected') {
          connect();
        }
      }, 3000);
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('disconnected');
      toast.error('Connection error - attempting to reconnect...');
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return websocket;
  }, [wsUrl, connectionStatus]);

  const handleMessage = useCallback((message) => {
    const { type, data } = message;

    switch (type) {
      case 'connection_established':
        console.log('📡 Initial data received:', data);
        if (data.models) setModels(data.models);
        if (data.activeTasks) setTasks(data.activeTasks);
        if (data.agents) setAgents(data.agents);
        if (data.metrics) setMetrics(data.metrics);
        break;

      case 'models_updated':
        console.log('🤖 Models updated:', data.length);
        setModels(data);
        break;

      case 'task_created':
        console.log('📝 Task created:', data.task.name);
        setTasks(prev => [...prev, data.task]);
        toast.success(`Task "${data.task.name}" created`);
        break;

      case 'task_updated':
        console.log('📝 Task updated:', data.taskId, data.updates);
        setTasks(prev => prev.map(task => 
          task.id.id === data.taskId 
            ? { ...task, ...data.updates }
            : task
        ));
        
        if (data.updates.status === 'completed') {
          const task = tasks.find(t => t.id.id === data.taskId);
          if (task) {
            toast.success(`Task "${task.name}" completed successfully`);
          }
        } else if (data.updates.status === 'failed') {
          const task = tasks.find(t => t.id.id === data.taskId);
          if (task) {
            toast.error(`Task "${task.name}" failed`);
          }
        }
        break;

      case 'task_progress':
        console.log('📊 Task progress:', data.taskId, `${data.progress}%`);
        setTasks(prev => prev.map(task => 
          task.id.id === data.taskId 
            ? { ...task, progress: data.progress }
            : task
        ));
        break;

      case 'task_completed':
        console.log('✅ Task completed:', data.taskId);
        setTasks(prev => prev.map(task => 
          task.id.id === data.taskId 
            ? { ...task, ...data.task, status: 'completed' }
            : task
        ));
        toast.success(
          `Task completed! ${data.result.summary}`,
          { 
            duration: 5000,
            icon: '🎉'
          }
        );
        break;

      case 'task_failed':
        console.log('❌ Task failed:', data.taskId, data.error);
        setTasks(prev => prev.map(task => 
          task.id.id === data.taskId 
            ? { ...task, status: 'failed', error: data.error }
            : task
        ));
        toast.error(
          `Task failed: ${data.error.message}`,
          { 
            duration: 6000,
            icon: '💥'
          }
        );
        break;

      case 'task_deleted':
        console.log('🗑️ Task deleted:', data.taskId);
        setTasks(prev => prev.filter(task => task.id.id !== data.taskId));
        toast.info('Task deleted');
        break;

      case 'task_archived':
        console.log('🗃️ Task archived:', data.taskId);
        setTasks(prev => prev.filter(task => task.id.id !== data.taskId));
        break;

      case 'task_cleaned_up':
        console.log('🧹 Task cleaned up:', data.taskId);
        setTasks(prev => prev.filter(task => task.id.id !== data.taskId));
        break;

      case 'metrics_updated':
        setMetrics(data);
        break;

      case 'health_updated':
        console.log('🏥 Health status updated:', data);
        // Could trigger UI updates for health indicators
        break;

      case 'config_updated':
        toast.success('Configuration updated successfully');
        break;

      case 'keys_updated':
        toast.success(`Updated ${data.count} API keys`);
        break;

      case 'agent_created':
        console.log('🤖 Agent created:', data.agent.name);
        setAgents(prev => [...prev, data.agent]);
        break;

      case 'agent_updated':
        console.log('🤖 Agent updated:', data.agentId);
        setAgents(prev => prev.map(agent => 
          agent.id.id === data.agentId 
            ? { ...agent, ...data.updates }
            : agent
        ));
        break;

      default:
        console.log('📨 Unknown message type:', type, data);
    }
  }, [tasks]);

  const sendMessage = useCallback((type, data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected, cannot send message:', type, data);
      toast.error('Not connected to server');
    }
  }, [ws]);

  useEffect(() => {
    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Auto-reconnect when connection is lost
  useEffect(() => {
    let reconnectInterval;

    if (connectionStatus === 'disconnected') {
      reconnectInterval = setInterval(() => {
        console.log('🔄 Attempting to reconnect...');
        connect();
      }, 5000);
    }

    return () => {
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
      }
    };
  }, [connectionStatus, connect]);

  const value = {
    connectionStatus,
    models,
    tasks,
    agents,
    metrics,
    sendMessage,
    setModels,
    setTasks,
    setAgents,
    setMetrics
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const wsUrl = process.env.NODE_ENV === 'production' 
    ? 'ws://0.0.0.0:8001/ws' 
    : 'ws://localhost:8001/ws';

  const connect = () => {
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('Connected');
        setSocket(ws);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('Disconnected');
        setSocket(null);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const timeout = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);
            connect();
          }, timeout);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Error');
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('Error');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socket) {
      socket.close();
    }
  };

  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  const value = {
    socket,
    connectionStatus,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
