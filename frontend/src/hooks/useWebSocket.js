
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketUrl } from '../services/api';

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
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'error'
  const [lastMessage, setLastMessage] = useState(null);
  const [messageHistory, setMessageHistory] = useState([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const heartbeatIntervalRef = useRef(null);
  const subscribersRef = useRef(new Map());
  const maxReconnectAttempts = 10;
  const maxMessageHistory = 100;

  // Calculate reconnection delay with exponential backoff
  const getReconnectDelay = useCallback((attempt) => {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }, []);

  // Send queued messages when connection is established
  const processMessageQueue = useCallback(() => {
    if (socket && isConnected && messageQueueRef.current.length > 0) {
      messageQueueRef.current.forEach(message => {
        socket.send(JSON.stringify(message));
      });
      messageQueueRef.current = [];
    }
  }, [socket, isConnected]);

  // Heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000); // Ping every 30 seconds
  }, [socket]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      return; // Already connecting or connected
    }

    setConnectionState('connecting');
    
    try {
      const wsUrl = getWebSocketUrl();
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('🔗 WebSocket connected');
        setSocket(newSocket);
        setIsConnected(true);
        setConnectionState('connected');
        setConnectionAttempts(0);
        
        startHeartbeat();
        processMessageQueue();
        
        // Send connection acknowledgment
        newSocket.send(JSON.stringify({
          type: 'connection_ack',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }));
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle pong responses
          if (message.type === 'pong') {
            return;
          }
          
          setLastMessage(message);
          
          // Add to message history
          setMessageHistory(prev => {
            const newHistory = [...prev, { ...message, receivedAt: Date.now() }];
            return newHistory.slice(-maxMessageHistory);
          });
          
          // Notify subscribers
          const messageType = message.type;
          if (subscribersRef.current.has(messageType)) {
            subscribersRef.current.get(messageType).forEach(callback => {
              try {
                callback(message);
              } catch (error) {
                console.error('Error in WebSocket subscriber:', error);
              }
            });
          }
          
          // Notify all message subscribers
          if (subscribersRef.current.has('*')) {
            subscribersRef.current.get('*').forEach(callback => {
              try {
                callback(message);
              } catch (error) {
                console.error('Error in WebSocket global subscriber:', error);
              }
            });
          }
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setSocket(null);
        stopHeartbeat();
        
        if (event.code !== 1000) { // Not a normal closure
          setConnectionState('error');
          
          // Attempt to reconnect if not at max attempts
          if (connectionAttempts < maxReconnectAttempts) {
            const delay = getReconnectDelay(connectionAttempts);
            console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${connectionAttempts + 1}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setConnectionAttempts(prev => prev + 1);
              connect();
            }, delay);
          } else {
            console.error('❌ Max reconnection attempts reached');
            setConnectionState('disconnected');
          }
        } else {
          setConnectionState('disconnected');
        }
      };

      newSocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionState('error');
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setConnectionState('error');
    }
  }, [socket, connectionAttempts, getReconnectDelay, startHeartbeat, processMessageQueue, stopHeartbeat]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopHeartbeat();
    
    if (socket) {
      socket.close(1000, 'Manual disconnect');
    }
    
    setSocket(null);
    setIsConnected(false);
    setConnectionState('disconnected');
    setConnectionAttempts(0);
  }, [socket, stopHeartbeat]);

  const sendMessage = useCallback((message) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      // Queue message for later sending
      messageQueueRef.current.push(message);
      console.log('📤 Message queued (WebSocket not connected):', message.type);
    }
  }, [socket, isConnected]);

  // Subscribe to specific message types
  const subscribe = useCallback((messageType, callback) => {
    if (!subscribersRef.current.has(messageType)) {
      subscribersRef.current.set(messageType, new Set());
    }
    subscribersRef.current.get(messageType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(messageType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          subscribersRef.current.delete(messageType);
        }
      }
    };
  }, []);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    return {
      isConnected,
      connectionState,
      connectionAttempts,
      messageHistory: messageHistory.length,
      queuedMessages: messageQueueRef.current.length,
      subscriberCount: Array.from(subscribersRef.current.values())
        .reduce((total, subscribers) => total + subscribers.size, 0)
    };
  }, [isConnected, connectionState, connectionAttempts, messageHistory.length]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('🔄 Page became visible, attempting to reconnect...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, connect]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online, attempting to reconnect...');
      if (!isConnected) {
        connect();
      }
    };

    const handleOffline = () => {
      console.log('📴 Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, connect]);

  const value = {
    socket,
    isConnected,
    connectionState,
    lastMessage,
    messageHistory,
    sendMessage,
    subscribe,
    connect,
    disconnect,
    getConnectionStats,
    connectionAttempts,
    maxReconnectAttempts
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;
