import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  CpuChipIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import { CardLoader, ChartLoader } from '../components/LoadingSpinner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const AnalyticsPage = () => {
  const { tasks, agents, models, metrics } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState({});

  useEffect(() => {
    generateAnalyticsData();
    const interval = setInterval(generateAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, [tasks, agents, timeRange]);

  const generateAnalyticsData = () => {
    setLoading(true);
    
    // Generate task performance data
    const taskPerformanceData = generateTimeSeriesData('tasks', timeRange);
    const agentPerformanceData = generateTimeSeriesData('agents', timeRange);
    const modelUsageData = generateModelUsageData();
    const successRateData = generateSuccessRateData();
    const hourlyDistribution = generateHourlyDistribution();
    
    setAnalyticsData({
      taskPerformance: taskPerformanceData,
      agentPerformance: agentPerformanceData,
      modelUsage: modelUsageData,
      successRate: successRateData,
      hourlyDistribution: hourlyDistribution
    });
    
    setLoading(false);
  };

  const generateTimeSeriesData = (type, range) => {
    const data = [];
    const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const intervals = range === '24h' ? 24 : days;
    
    for (let i = intervals - 1; i >= 0; i--) {
      const date = new Date();
      if (range === '24h') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      data.push({
        time: range === '24h' 
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        timestamp: date.getTime(),
        created: Math.floor(Math.random() * 20) + 5,
        completed: Math.floor(Math.random() * 15) + 3,
        failed: Math.floor(Math.random() * 5) + 1,
        active: Math.floor(Math.random() * 10) + 2
      });
    }
    
    return data;
  };

  const generateModelUsageData = () => {
    const modelNames = ['GPT-4', 'Claude-3', 'Llama-2', 'Mistral-7B', 'Gemini-Pro'];
    return modelNames.map(name => ({
      name,
      usage: Math.floor(Math.random() * 1000) + 100,
      cost: (Math.random() * 50 + 10).toFixed(2),
      requests: Math.floor(Math.random() * 500) + 50
    }));
  };

  const generateSuccessRateData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        successRate: Math.floor(Math.random() * 20) + 75,
        totalTasks: Math.floor(Math.random() * 100) + 50
      });
    }
    return data;
  };

  const generateHourlyDistribution = () => {
    const data = [];
    for (let hour = 0; hour < 24; hour++) {
      data.push({
        hour: hour.toString().padStart(2, '0') + ':00',
        tasks: Math.floor(Math.random() * 30) + (hour >= 9 && hour <= 17 ? 20 : 5)
      });
    }
    return data;
  };

  const calculateTrend = (data, field) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-3).reduce((sum, item) => sum + item[field], 0) / 3;
    const previous = data.slice(-6, -3).reduce((sum, item) => sum + item[field], 0) / 3;
    return ((recent - previous) / previous * 100).toFixed(1);
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUpIcon className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDownIcon className="w-4 h-4 text-red-600" />;
    return <div className="w-4 h-4" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading && !analyticsData.taskPerformance) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Performance insights and trend analysis</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <CardLoader key={i} />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <ChartLoader key={i} />
          ))}
        </div>
      </div>
    );
  }

  const taskTrend = calculateTrend(analyticsData.taskPerformance || [], 'completed');
  const agentTrend = calculateTrend(analyticsData.agentPerformance || [], 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Performance insights and trend analysis</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={generateAnalyticsData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Tasks</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalTasks}</p>
              <div className="flex items-center mt-2">
                {getTrendIcon(taskTrend)}
                <span className={`text-sm font-medium ml-1 ${getTrendColor(taskTrend)}`}>
                  {Math.abs(taskTrend)}% {taskTrend >= 0 ? 'increase' : 'decrease'}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <ChartBarIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalTasks > 0 ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) : 100}%
              </p>
              <div className="flex items-center mt-2">
                <TrendingUpIcon className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium ml-1 text-green-600">2.1% increase</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Active Agents</h3>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
              <div className="flex items-center mt-2">
                {getTrendIcon(agentTrend)}
                <span className={`text-sm font-medium ml-1 ${getTrendColor(agentTrend)}`}>
                  {Math.abs(agentTrend)}% {agentTrend >= 0 ? 'increase' : 'decrease'}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <UserGroupIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Available Models</h3>
              <p className="text-2xl font-bold text-gray-900">{models.length}</p>
              <div className="flex items-center mt-2">
                <div className="w-4 h-4" />
                <span className="text-sm font-medium ml-1 text-gray-600">Live data</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
              <CpuChipIcon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Performance Over Time */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Performance</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Created</span>
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
            <LineChart data={analyticsData.taskPerformance}>
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
              <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Success Rate Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Rate Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.successRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} domain={[60, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value}%`, 'Success Rate']}
              />
              <Area 
                type="monotone" 
                dataKey="successRate" 
                stroke="#10b981" 
                fill="#dcfce7" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Usage */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Usage Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.modelUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="usage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Task Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Distribution by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="tasks" 
                stroke="#f59e0b" 
                fill="#fef3c7" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Usage Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detailed Model Analytics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData.modelUsage?.map((model, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{model.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{model.requests.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{model.usage}h</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${model.cost}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full mr-2">
                        <div 
                          className="h-2 bg-green-500 rounded-full" 
                          style={{ width: `${Math.random() * 40 + 60}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.floor(Math.random() * 40 + 60)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;