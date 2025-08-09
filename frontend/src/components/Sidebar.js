import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  CpuChipIcon, 
  ClipboardDocumentListIcon, 
  UserGroupIcon, 
  CogIcon,
  ChartBarIcon,
  ServerIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';

const Sidebar = ({ appVersion, isHealthy }) => {
  const location = useLocation();
  const { connectionStatus, metrics } = useWebSocket();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Models', href: '/models', icon: CpuChipIcon },
    { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Agents', href: '/agents', icon: UserGroupIcon },
    { name: 'Analytics', href: '/analytics', icon: PresentationChartLineIcon },
    { name: 'System', href: '/system', icon: ServerIcon },
    { name: 'Configuration', href: '/config', icon: CogIcon },
  ];

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'connection-connected';
      case 'reconnecting': return 'connection-reconnecting';
      case 'disconnected': return 'connection-disconnected';
      default: return 'connection-disconnected';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'reconnecting': return 'Reconnecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Claude-Flow</h1>
            <p className="text-xs text-gray-500">v{appVersion || '2.0.0-alpha.84'}</p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className={`connection-indicator ${getConnectionStatusColor()}`}></span>
          <span className="text-sm text-gray-600">{getConnectionStatusText()}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{metrics.activeTasks}</div>
            <div className="text-gray-500">Active Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{metrics.totalAgents}</div>
            <div className="text-gray-500">Agents</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{metrics.completedTasks}</div>
            <div className="text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{metrics.failedTasks}</div>
            <div className="text-gray-500">Failed</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                ${isActive
                  ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>Enterprise AI Orchestration</div>
          <div>🐝 Hive-Mind Intelligence</div>
          <div>⚡ Real-time Coordination</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;