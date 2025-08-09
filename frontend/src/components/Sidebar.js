import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  CpuChipIcon, 
  ClipboardDocumentListIcon, 
  UserGroupIcon, 
  CogIcon,
  ChartBarIcon,
  ServerIcon,
  PresentationChartLineIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../contexts/ThemeContext';
import SearchBar from './SearchBar';

const Sidebar = ({ appVersion, isHealthy, collapsed, onToggle }) => {
  const location = useLocation();
  const { connectionStatus, metrics } = useWebSocket();
  const { theme, toggleTheme, compactMode, toggleCompactMode } = useTheme();
  const [showSearch, setShowSearch] = useState(false);

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
    <div className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-20 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Claude-Flow</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">v{appVersion || '2.0.0-alpha.84'}</p>
            </div>
          </div>
        )}
        
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Search Bar */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <SearchBar 
            placeholder="Search..."
            className="w-full"
          />
        </div>
      )}

      {/* Connection Status */}
      <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 ${
        collapsed ? 'px-2' : ''
      }`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center space-x-2">
            <span className={`connection-indicator ${getConnectionStatusColor()}`}></span>
            {!collapsed && (
              <span className="text-sm text-gray-600 dark:text-gray-300">{getConnectionStatusText()}</span>
            )}
          </div>
          {!collapsed && isHealthy !== null && (
            <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-400' : 'bg-red-400'}`} title={isHealthy ? 'System Healthy' : 'System Issues'}></div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{metrics.activeTasks}</div>
              <div className="text-gray-500 dark:text-gray-400">Active Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">{metrics.totalAgents}</div>
              <div className="text-gray-500 dark:text-gray-400">Agents</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">{metrics.completedTasks}</div>
              <div className="text-gray-500 dark:text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">{metrics.failedTasks}</div>
              <div className="text-gray-500 dark:text-gray-400">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 group
                ${isActive
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-r-2 border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }
                ${collapsed ? 'justify-center px-2' : ''}
              `}
              title={collapsed ? item.name : ''}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'} ${
                collapsed ? '' : 'mr-3'
              }`} />
              {!collapsed && item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Theme & Settings */}
      <div className={`p-4 border-t border-gray-200 dark:border-gray-700 space-y-2`}>
        {!collapsed && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? (
                <MoonIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <SunIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>
        )}
        
        {collapsed && (
          <div className="flex justify-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? (
                <MoonIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <SunIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={toggleCompactMode}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {compactMode ? 'Normal Mode' : 'Compact Mode'}
          </button>
        )}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Enterprise AI Orchestration</div>
            <div>🐝 Hive-Mind Intelligence</div>
            <div>⚡ Real-time Coordination</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ appVersion, isHealthy, collapsed, onToggle }) => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Models', href: '/models', icon: '🤖' },
    { name: 'Tasks', href: '/tasks', icon: '📋' },
    { name: 'Agents', href: '/agents', icon: '👥' },
    { name: 'Analytics', href: '/analytics', icon: '📈' },
    { name: 'System', href: '/system', icon: '⚙️' },
    { name: 'Config', href: '/config', icon: '🔧' },
  ];

  return (
    <div className={`bg-gray-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex flex-col fixed left-0 top-0 h-full z-20`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold">Claude-Flow</h1>
            <p className="text-xs text-gray-400">{appVersion}</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                <span className="text-xl mr-3">{item.icon}</span>
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-gray-700">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
          {!collapsed && (
            <span className="text-sm text-gray-400">
              {isHealthy ? 'Connected' : 'Disconnected'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
