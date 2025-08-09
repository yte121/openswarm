import React, { useState, useEffect } from 'react';
import { 
  CpuChipIcon,
  ServerIcon,
  CircleStackIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import { getMetrics, healthCheck } from '../services/api';
import { ChartLoader, CardLoader } from '../components/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const SystemPage = () => {
  const { connectionStatus } = useWebSocket();
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadSystemMetrics();
    generatePerformanceData();
    
    const interval = setInterval(() => {
      loadSystemMetrics();
      generatePerformanceData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadSystemMetrics = async () => {
    try {
      const response = await getMetrics();
      setSystemMetrics(response.data.metrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load system metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceData = () => {
    const data = [];
    const now = Date.now();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = now - (i * 5 * 60 * 1000); // 5-minute intervals
      data.push({
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: Math.random() * 30 + 20,
        memory: Math.random() * 40 + 40,
        network: Math.random() * 100 + 50,
        disk: Math.random() * 20 + 10
      });
    }
    
    setPerformanceData(data);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'disconnected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'error':
      case 'disconnected':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Monitor</h1>
            <p className="text-gray-600 mt-1">Real-time system health and performance metrics</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <CardLoader key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitor</h1>
          <p className="text-gray-600 mt-1">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadSystemMetrics}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">System Status</h3>
              <p className="text-2xl font-bold text-gray-900">
                {connectionStatus === 'connected' ? 'Online' : 'Offline'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${getStatusColor(connectionStatus === 'connected' ? 'healthy' : 'error')}`}>
              <ServerIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(connectionStatus === 'connected' ? 'healthy' : 'error')}`}>
              {getStatusIcon(connectionStatus === 'connected' ? 'healthy' : 'error')}
              <span className="ml-1">
                {connectionStatus === 'connected' ? 'All systems operational' : 'System offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Uptime</h3>
              <p className="text-2xl font-bold text-gray-900">
                {systemMetrics ? formatUptime(systemMetrics.uptime) : '0m'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <ClockIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              Started {systemMetrics ? new Date(Date.now() - (systemMetrics.uptime * 1000)).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Memory Usage</h3>
              <p className="text-2xl font-bold text-gray-900">
                {systemMetrics ? formatBytes(systemMetrics.memory.heapUsed) : '0 MB'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <CpuChipIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: systemMetrics 
                    ? `${Math.min((systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100, 100)}%`
                    : '0%'
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {systemMetrics ? formatBytes(systemMetrics.memory.heapTotal) : '0 MB'} total
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Provider Health</h3>
              <p className="text-2xl font-bold text-gray-900">
                {systemMetrics?.providerHealth === 'healthy' ? 'Healthy' : 'Warning'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${getStatusColor(systemMetrics?.providerHealth === 'healthy' ? 'healthy' : 'warning')}`}>
              <GlobeAltIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(systemMetrics?.providerHealth === 'healthy' ? 'healthy' : 'warning')}`}>
              {getStatusIcon(systemMetrics?.providerHealth === 'healthy' ? 'healthy' : 'warning')}
              <span className="ml-1">
                {systemMetrics?.providerHealth === 'healthy' ? 'All providers active' : 'Some issues detected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
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
              <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} name="CPU %" />
              <Line type="monotone" dataKey="memory" stroke="#10b981" strokeWidth={2} name="Memory %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network & Disk I/O</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
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
              <Area type="monotone" dataKey="network" stackId="1" stroke="#f59e0b" fill="#fef3c7" name="Network KB/s" />
              <Area type="monotone" dataKey="disk" stackId="1" stroke="#ef4444" fill="#fee2e2" name="Disk KB/s" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">System Information</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Runtime Environment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Node.js Version:</span>
                  <span className="font-mono">v{process.version || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform:</span>
                  <span className="font-mono">{navigator.platform || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">User Agent:</span>
                  <span className="font-mono text-xs truncate" title={navigator.userAgent}>
                    {navigator.userAgent?.substring(0, 30) + '...' || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Memory Details</h4>
              <div className="space-y-2 text-sm">
                {systemMetrics?.memory && Object.entries(systemMetrics.memory).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="font-mono">{formatBytes(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Application</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Version:</span>
                  <span className="font-mono">2.0.0-alpha.84</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Environment:</span>
                  <span className="font-mono">
                    {process.env.NODE_ENV || 'development'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Build:</span>
                  <span className="font-mono">{Date.now().toString(36)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPage;
import React from 'react';

const SystemPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          System configuration and monitoring
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Backend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <span className="text-green-600 dark:text-green-400">Running</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Port</span>
                <span className="text-gray-900 dark:text-white">8001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Version</span>
                <span className="text-gray-900 dark:text-white">2.0.0-alpha.84</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Frontend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <span className="text-green-600 dark:text-green-400">Running</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Port</span>
                <span className="text-gray-900 dark:text-white">3000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Version</span>
                <span className="text-gray-900 dark:text-white">2.0.0-alpha.84</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPage;
