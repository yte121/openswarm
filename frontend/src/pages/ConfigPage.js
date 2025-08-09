import React, { useState, useEffect } from 'react';
import { 
  KeyIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import { getOpenRouterKeys, updateOpenRouterKeys, getProviderHealth } from '../services/api';
import toast from 'react-hot-toast';

const ConfigPage = () => {
  const { connectionStatus } = useWebSocket();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [newKey, setNewKey] = useState('');
  const [providerHealth, setProviderHealth] = useState({});
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadApiKeys();
    loadProviderHealth();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await getOpenRouterKeys();
      setApiKeys(response.data.keys || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    }
  };

  const loadProviderHealth = async () => {
    try {
      const response = await getProviderHealth();
      setProviderHealth(response.data.health || {});
    } catch (error) {
      console.error('Failed to load provider health:', error);
    }
  };

  const handleAddKey = () => {
    if (!newKey.trim()) {
      toast.error('Please enter a valid API key');
      return;
    }

    if (newKey.length < 20) {
      toast.error('API key appears to be too short');
      return;
    }

    // Validate OpenRouter API key format (basic validation)
    if (!newKey.startsWith('sk-or-')) {
      toast.error('Invalid OpenRouter API key format. Keys should start with "sk-or-"');
      return;
    }

    const newKeyObj = {
      id: Date.now(),
      key: newKey.trim(),
      status: 'pending'
    };

    setApiKeys([...apiKeys, newKeyObj]);
    setNewKey('');
    toast.success('API key added. Click "Save Configuration" to apply changes.');
  };

  const handleRemoveKey = (keyId) => {
    setApiKeys(apiKeys.filter(key => key.id !== keyId));
    toast.success('API key removed. Click "Save Configuration" to apply changes.');
  };

  const handleSaveKeys = async () => {
    if (apiKeys.length === 0) {
      toast.error('At least one API key is required');
      return;
    }

    setLoading(true);
    try {
      const keys = apiKeys.map(key => key.key);
      await updateOpenRouterKeys(keys);
      toast.success('Configuration saved successfully!');
      
      // Reload keys to get updated status
      setTimeout(() => {
        loadApiKeys();
        loadProviderHealth();
      }, 2000);
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error('Error saving keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await loadProviderHealth();
      toast.success('Connection test completed');
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const toggleKeyVisibility = (keyId) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const maskKey = (key) => {
    if (key.length <= 12) return '****...****';
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  const getKeyStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProviderStatusIcon = (healthy) => {
    return healthy ? (
      <CheckCircleIcon className="w-5 h-5 text-green-600" />
    ) : (
      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuration</h1>
          <p className="text-gray-600 mt-1">Manage OpenRouter API keys and system settings</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
          <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
              <p className="text-2xl font-bold text-blue-600">{apiKeys.length}</p>
              <p className="text-sm text-gray-500">
                {apiKeys.filter(key => key.status === 'active').length} active
              </p>
            </div>
            <KeyIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Provider Status</h3>
              <p className="text-2xl font-bold text-green-600">
                {Object.values(providerHealth).filter(p => p.healthy).length}
              </p>
              <p className="text-sm text-gray-500">
                of {Object.keys(providerHealth).length} healthy
              </p>
            </div>
            {getProviderStatusIcon(Object.values(providerHealth).some(p => p.healthy))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connection</h3>
              <p className="text-2xl font-bold text-purple-600">
                {connectionStatus === 'connected' ? 'Live' : 'Offline'}
              </p>
              <p className="text-sm text-gray-500">Real-time status</p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              connectionStatus === 'connected' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={`w-4 h-4 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></span>
            </div>
          </div>
        </div>
      </div>

      {/* OpenRouter API Keys */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">OpenRouter API Keys</h2>
              <p className="text-gray-600 mt-1">
                Manage your OpenRouter API keys for autonomous operations with multiple key rotation
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''} configured
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Add New Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New API Key
            </label>
            <div className="flex space-x-3">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
              />
              <button
                onClick={handleAddKey}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Key</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter your OpenRouter API key starting with "sk-or-". Multiple keys enable automatic rotation and higher rate limits.
            </p>
          </div>

          {/* API Keys List */}
          <div className="space-y-3">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <KeyIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No API keys configured</p>
                <p className="text-sm text-gray-400">Add your first OpenRouter API key above</p>
              </div>
            ) : (
              apiKeys.map((keyObj, index) => (
                <div key={keyObj.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm text-gray-900">
                          {showKeys[keyObj.id] ? keyObj.key : maskKey(keyObj.key)}
                        </span>
                        <button
                          onClick={() => toggleKeyVisibility(keyObj.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showKeys[keyObj.id] ? (
                            <EyeSlashIcon className="w-4 h-4" />
                          ) : (
                            <EyeIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getKeyStatusColor(keyObj.status)}`}>
                          {keyObj.status || 'pending'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Added {new Date().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveKey(keyObj.id)}
                    className="text-red-600 hover:text-red-800 p-2 rounded"
                    title="Remove API key"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Save Button */}
          {apiKeys.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveKeys}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Saving Configuration...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Provider Health Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Provider Health Status</h2>
          <p className="text-gray-600 mt-1">Real-time status of AI provider connections</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Object.keys(providerHealth).length === 0 ? (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No provider health data available</p>
                <p className="text-sm text-gray-400">Configure API keys to see provider status</p>
              </div>
            ) : (
              Object.entries(providerHealth).map(([provider, health]) => (
                <div key={provider} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getProviderStatusIcon(health.healthy)}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 capitalize">{provider}</h3>
                      <p className="text-xs text-gray-500">
                        {health.healthy ? 'Service is operational' : health.error || 'Service unavailable'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      health.healthy 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {health.healthy ? 'Healthy' : 'Error'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">API Key Best Practices</h3>
            <div className="mt-2 text-sm text-blue-800">
              <ul className="list-disc list-inside space-y-1">
                <li>Use multiple API keys for higher rate limits and automatic failover</li>
                <li>Keep your API keys secure and never share them publicly</li>
                <li>Monitor your OpenRouter usage and billing regularly</li>
                <li>Rotate keys periodically for enhanced security</li>
                <li>Test connections after adding new keys</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ConfigPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [config, setConfig] = useState({
    autoSave: true,
    notifications: true,
    darkMode: isDark
  });

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    if (key === 'darkMode') {
      toggleTheme();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuration</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage system settings and preferences
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">General Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable dark theme</p>
            </div>
            <button
              onClick={() => handleConfigChange('darkMode', !config.darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.darkMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">Auto Save</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatically save changes</p>
            </div>
            <button
              onClick={() => handleConfigChange('autoSave', !config.autoSave)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.autoSave ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.autoSave ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">Notifications</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Show system notifications</p>
            </div>
            <button
              onClick={() => handleConfigChange('notifications', !config.notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;
