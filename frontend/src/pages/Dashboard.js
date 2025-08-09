
import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getMetrics, getTasks, getAgents, getSystemStatus } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../contexts/NotificationContext';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [dashboardStats, setDashboardStats] = useState({
    totalRequests: 0,
    successRate: 0,
    avgResponseTime: 0,
    errorRate: 0
  });

  const { isConnected, subscribe, sendMessage, getConnectionStats } = useWebSocket();
  const { addNotification } = useNotification();

  // Real-time metrics calculation
  const calculateDashboardStats = useCallback((metricsData, tasksData) => {
    if (!metricsData || !tasksData) return;

    const totalTasks = tasksData.length;
    const completedTasks = tasksData.filter(task => task.status === 'completed').length;
    const failedTasks = tasksData.filter(task => task.status === 'failed').length;
    const successRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 100;
    const errorRate = totalTasks > 0 ? ((failedTasks / totalTasks) * 100).toFixed(1) : 0;
    
    // Calculate average response time from completed tasks
    const completedTasksWithDuration = tasksData.filter(
      task => task.status === 'completed' && task.metrics?.duration
    );
    const avgResponseTime = completedTasksWithDuration.length > 0 
      ? Math.round(completedTasksWithDuration.reduce((sum, task) => sum + task.metrics.duration, 0) / completedTasksWithDuration.length)
      : 0;

    setDashboardStats({
      totalRequests: totalTasks,
      successRate: parseFloat(successRate),
      avgResponseTime,
      errorRate: parseFloat(errorRate)
    });
  }, []);

  // Load initial data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [metricsRes, tasksRes, agentsRes, statusRes] = await Promise.all([
        getMetrics(),
        getTasks(),
        getAgents(),
        getSystemStatus().catch(() => ({ data: null })) // Non-critical
      ]);

      setMetrics(metricsRes.data);
      setTasks(tasksRes.data?.tasks || []);
      setAgents(agentsRes.data?.agents || []);
      setSystemStatus(statusRes.data);
      
      calculateDashboardStats(metricsRes.data, tasksRes.data?.tasks || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      addNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification, calculateDashboardStats]);

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    const unsubscriptions = [];

    // Subscribe to metrics updates
    unsubscriptions.push(subscribe('metrics_updated', (message) => {
      setMetrics(message.data);
      calculateDashboardStats(message.data, tasks);
    }));

    // Subscribe to task updates
    unsubscriptions.push(subscribe('task_created', (message) => {
      setTasks(prev => [...prev, message.data.task]);
    }));

    unsubscriptions.push(subscribe('task_completed', (message) => {
      setTasks(prev => prev.map(task => 
        task.id === message.data.taskId 
          ? { ...task, ...message.data.task }
          : task
      ));
    }));

    unsubscriptions.push(subscribe('task_failed', (message) => {
      setTasks(prev => prev.map(task => 
        task.id === message.data.taskId 
          ? { ...task, status: 'failed', error: message.data.error }
          : task
      ));
    }));

    // Subscribe to agent updates
    unsubscriptions.push(subscribe('agent_status_changed', (message) => {
      setAgents(prev => prev.map(agent => 
        agent.id === message.data.agentId 
          ? { ...agent, status: message.data.status }
          : agent
      ));
    }));

    // Subscribe to system health updates
    unsubscriptions.push(subscribe('health_updated', (message) => {
      setSystemStatus(message.data);
    }));

    return () => {
      unsubscriptions.forEach(unsub => unsub());
    };
  }, [subscribe, tasks, calculateDashboardStats]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (isConnected) {
        // Request fresh data via WebSocket
        sendMessage({ type: 'request_dashboard_update' });
      } else {
        // Fallback to HTTP if WebSocket is disconnected
        loadDashboardData();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isConnected, sendMessage, loadDashboardData]);

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Get active tasks count
  const activeTasks = tasks.filter(task => 
    task.status === 'running' || task.status === 'created'
  ).length;

  // Get active agents count
  const activeAgents = agents.filter(agent => 
    agent.status === 'active' || agent.status === 'running'
  ).length;

  // System health indicator
  const getHealthStatus = () => {
    if (!systemStatus) return 'unknown';
    if (systemStatus.backend && systemStatus.providers) return 'healthy';
    if (systemStatus.backend) return 'degraded';
    return 'unhealthy';
  };

  const healthStatus = getHealthStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Claude-Flow Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            System Overview and Real-time Monitoring
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Auto-refresh Toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh</span>
          </label>
          
          {/* Refresh Interval */}
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600"
            disabled={!autoRefresh}
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
        </div>
      </div>

      {/* System Health Banner */}
      {healthStatus !== 'healthy' && (
        <div className={`rounded-lg p-4 ${
          healthStatus === 'degraded' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-3 ${
              healthStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className={`text-sm font-medium ${
              healthStatus === 'degraded' ? 'text-yellow-800' : 'text-red-800'
            }`}>
              {healthStatus === 'degraded' 
                ? 'System running with limited functionality' 
                : 'System health issues detected'}
            </span>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTasks}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeAgents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardStats.successRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardStats.avgResponseTime}ms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity and Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Tasks
            </h2>
          </div>
          <div className="p-6">
            {tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'running' ? 'bg-blue-500 animate-pulse' :
                        task.status === 'failed' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-48">
                          {task.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {task.status} • {task.model || 'auto'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {task.metrics?.duration ? `${task.metrics.duration}ms` : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No tasks yet
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Status
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* WebSocket Connection */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">WebSocket</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              {/* Backend Health */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Backend</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    systemStatus?.backend ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {systemStatus?.backend ? 'Healthy' : 'Unhealthy'}
                  </span>
                </div>
              </div>

              {/* Providers Health */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">AI Providers</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    systemStatus?.providers ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {systemStatus?.providers ? 'Available' : 'Limited'}
                  </span>
                </div>
              </div>

              {/* Memory Usage */}
              {metrics?.memory && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {Math.round(metrics.memory.heapUsed / 1024 / 1024)}MB
                  </span>
                </div>
              )}

              {/* Uptime */}
              {metrics?.uptime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
          <button
            onClick={() => sendMessage({ type: 'request_system_health' })}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Check Health
          </button>
          <button
            onClick={() => window.location.href = '/tasks'}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            View All Tasks
          </button>
          <button
            onClick={() => window.location.href = '/agents'}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Manage Agents
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
