import React, { useEffect, useState } from 'react';
import { 
  ChartBarIcon, 
  CpuChipIcon, 
  ClipboardDocumentListIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import { getMetrics, getProviderHealth } from '../services/api';

const Dashboard = () => {
  const { connectionStatus, metrics, tasks, agents, models } = useWebSocket();
  const [providerHealth, setProviderHealth] = useState({});
  const [taskHistory, setTaskHistory] = useState([]);

  useEffect(() => {
    loadProviderHealth();
    generateTaskHistory();
  }, []);

  useEffect(() => {
    generateTaskHistory();
  }, [tasks]);

  const loadProviderHealth = async () => {
    try {
      const response = await getProviderHealth();
      setProviderHealth(response.data.health || {});
    } catch (error) {
      console.error('Failed to load provider health:', error);
    }
  };

  const generateTaskHistory = () => {
    // Generate sample task history data for the chart
    const history = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now - (i * 60 * 60 * 1000));
      const hour = time.getHours();
      
      history.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        completed: Math.floor(Math.random() * 10) + (hour > 8 && hour < 18 ? 5 : 2),
        failed: Math.floor(Math.random() * 3),
        active: Math.floor(Math.random() * 5) + 1
      });
    }
    
    setTaskHistory(history);
  };

  const getTasksByStatus = () => {
    const statusCounts = {
      running: 0,
      completed: 0,
      failed: 0,
      created: 0
    };

    tasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });

    return [
      { name: 'Running', value: statusCounts.running, color: '#3b82f6' },
      { name: 'Completed', value: statusCounts.completed, color: '#10b981' },
      { name: 'Failed', value: statusCounts.failed, color: '#ef4444' },
      { name: 'Created', value: statusCounts.created, color: '#f59e0b' }
    ];
  };

  const getRecentTasks = () => {
    return tasks
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, 5);
  };

  const getActiveAgents = () => {
    return agents.filter(agent => agent.status === 'active' || agent.status === 'running');
  };

  const stats = [
    {
      name: 'Total Tasks',
      value: metrics.totalTasks,
      icon: ClipboardDocumentListIcon,
      color: 'blue',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Available Models',
      value: models.length,
      icon: CpuChipIcon,
      color: 'purple',
      change: 'Live',
      changeType: 'neutral'
    },
    {
      name: 'Active Agents',
      value: getActiveAgents().length,
      icon: UserGroupIcon,
      color: 'green',
      change: `${agents.length} total`,
      changeType: 'neutral'
    },
    {
      name: 'Success Rate',
      value: metrics.totalTasks > 0 ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) + '%' : '100%',
      icon: CheckCircleIcon,
      color: 'emerald',
      change: '↗ Trending up',
      changeType: 'positive'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claude-Flow Dashboard</h1>
          <p className="text-gray-600 mt-1">AI Orchestration & Swarm Intelligence Platform</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-800' 
              : connectionStatus === 'reconnecting'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`}></span>
            {connectionStatus === 'connected' ? 'Live' : 
             connectionStatus === 'reconnecting' ? 'Connecting...' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-xs mt-1 ${
                  stat.changeType === 'positive' ? 'text-green-600' :
                  stat.changeType === 'negative' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task History Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Activity (24h)</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Active</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Failed</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={taskHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="active" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Task Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getTasksByStatus()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {getTasksByStatus().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {getTasksByStatus().map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                  <span>{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tasks & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tasks</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {getRecentTasks().length > 0 ? getRecentTasks().map((task, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded ${
                    task.status === 'completed' ? 'bg-green-100 text-green-600' :
                    task.status === 'running' ? 'bg-blue-100 text-blue-600' :
                    task.status === 'failed' ? 'bg-red-100 text-red-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {task.status === 'completed' ? <CheckCircleIcon className="w-4 h-4" /> :
                     task.status === 'running' ? <PlayCircleIcon className="w-4 h-4" /> :
                     task.status === 'failed' ? <XCircleIcon className="w-4 h-4" /> :
                     <ClockIcon className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(task.created).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  task.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.priority}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardDocumentListIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent tasks</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">WebSocket Connection</span>
              <div className={`flex items-center space-x-2 px-2 py-1 rounded text-xs ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                connectionStatus === 'reconnecting' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'reconnecting' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></span>
                <span className="capitalize">{connectionStatus}</span>
              </div>
            </div>

            {/* Provider Health */}
            {Object.entries(providerHealth).map(([provider, health]) => (
              <div key={provider} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{provider} Provider</span>
                <div className={`flex items-center space-x-2 px-2 py-1 rounded text-xs ${
                  health.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    health.healthy ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span>{health.healthy ? 'Healthy' : 'Error'}</span>
                </div>
              </div>
            ))}

            {/* Memory Usage */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <span className="text-xs text-gray-500">65%</span>
              </div>
            </div>

            {/* CPU Usage */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <span className="text-xs text-gray-500">45%</span>
              </div>
            </div>

            {/* Active Connections */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Connections</span>
              <span className="text-sm font-medium text-gray-900">{metrics.activeAgents || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import { healthCheck, getSystemStatus } from '../services/api';

const Dashboard = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [health, status] = await Promise.all([
          healthCheck(),
          getSystemStatus().catch(() => ({ status: 'unknown' }))
        ]);
        setSystemStatus({ ...health, ...status });
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h3 className="text-red-800 dark:text-red-400 font-medium">Error</h3>
        <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview of your Claude-Flow system
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <div className="w-6 h-6 text-green-600 dark:text-green-400">✓</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {systemStatus?.status === 'healthy' ? 'Healthy' : 'Issues'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <div className="w-6 h-6 text-blue-600 dark:text-blue-400">🤖</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Agents</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {systemStatus?.activeAgents || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <div className="w-6 h-6 text-yellow-600 dark:text-yellow-400">📋</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Running Tasks</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {systemStatus?.runningTasks || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <div className="w-6 h-6 text-purple-600 dark:text-purple-400">⚡</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uptime</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {systemStatus?.uptime || '0h'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="text-lg font-medium text-gray-900 dark:text-white">Start New Task</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Create and execute a new task</div>
          </button>
          
          <button className="p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="text-lg font-medium text-gray-900 dark:text-white">Manage Agents</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Configure and monitor agents</div>
          </button>
          
          <button className="p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="text-lg font-medium text-gray-900 dark:text-white">View Analytics</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Check system performance</div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-600">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">System initialized</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Claude-Flow backend started successfully</p>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Just now</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
