import React, { useState } from 'react';
import { 
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  InformationCircleIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';

const AgentsPage = () => {
  const { agents, tasks } = useWebSocket();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const getAgentTasks = (agentId) => {
    return tasks.filter(task => task.agent?.id?.id === agentId);
  };

  const getAgentStatusIcon = (status) => {
    switch (status) {
      case 'active':
      case 'running':
        return <PlayCircleIcon className="w-5 h-5 text-green-600" />;
      case 'idle':
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
      case 'paused':
        return <PauseCircleIcon className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <InformationCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <UserGroupIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAgentStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'idle':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAgentTypeIcon = (type) => {
    switch (type) {
      case 'coder':
      case 'developer':
        return '💻';
      case 'researcher':
      case 'analyst':
        return '🔍';
      case 'writer':
      case 'content':
        return '✍️';
      case 'tester':
      case 'qa':
        return '🧪';
      case 'architect':
      case 'designer':
        return '🏗️';
      case 'coordinator':
      case 'manager':
        return '👑';
      case 'security':
        return '🛡️';
      case 'devops':
        return '🚀';
      default:
        return '🤖';
    }
  };

  const getAgentTypeColor = (type) => {
    switch (type) {
      case 'coder':
      case 'developer':
        return 'bg-blue-100 text-blue-800';
      case 'researcher':
      case 'analyst':
        return 'bg-purple-100 text-purple-800';
      case 'writer':
      case 'content':
        return 'bg-green-100 text-green-800';
      case 'tester':
      case 'qa':
        return 'bg-orange-100 text-orange-800';
      case 'architect':
      case 'designer':
        return 'bg-indigo-100 text-indigo-800';
      case 'coordinator':
      case 'manager':
        return 'bg-yellow-100 text-yellow-800';
      case 'security':
        return 'bg-red-100 text-red-800';
      case 'devops':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    const matchesType = filterType === 'all' || agent.type === filterType;
    return matchesStatus && matchesType;
  });

  const getAgentCapabilities = (agent) => {
    if (!agent.capabilities) return [];
    
    return Object.entries(agent.capabilities)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);
  };

  const getAgentTypes = () => {
    const types = [...new Set(agents.map(agent => agent.type))];
    return types.sort();
  };

  const getAgentPerformanceScore = (agent) => {
    const agentTasks = getAgentTasks(agent.id.id);
    if (agentTasks.length === 0) return 100;
    
    const completed = agentTasks.filter(t => t.status === 'completed').length;
    const failed = agentTasks.filter(t => t.status === 'failed').length;
    const total = agentTasks.length;
    
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your AI agent workforce</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Swarm Intelligence: <span className="text-blue-600 font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{agents.length}</div>
          <div className="text-sm text-gray-500">Total Agents</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {agents.filter(a => a.status === 'active' || a.status === 'running').length}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">
            {agents.filter(a => a.status === 'idle').length}
          </div>
          <div className="text-sm text-gray-500">Idle</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{getAgentTypes().length}</div>
          <div className="text-sm text-gray-500">Agent Types</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">
            {agents.length > 0 
              ? Math.round(agents.reduce((sum, agent) => sum + getAgentPerformanceScore(agent), 0) / agents.length)
              : 100
            }%
          </div>
          <div className="text-sm text-gray-500">Avg Performance</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {getAgentTypes().map(type => (
              <option key={type} value={type} className="capitalize">{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Agents Grid/List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
            <p className="text-gray-500">Agents will appear here when tasks are created and assigned.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent, index) => {
                const agentTasks = getAgentTasks(agent.id.id);
                const capabilities = getAgentCapabilities(agent);
                const performanceScore = getAgentPerformanceScore(agent);

                return (
                  <div key={agent.id.id} className="border border-gray-200 rounded-lg p-6 card-hover">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getAgentTypeIcon(agent.type)}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                          <p className="text-sm text-gray-500">Agent ID: {agent.id.id.slice(-8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getAgentStatusIcon(agent.status)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Status and Type */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAgentStatusColor(agent.status)}`}>
                          {agent.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAgentTypeColor(agent.type)}`}>
                          {agent.type}
                        </span>
                      </div>

                      {/* Performance Score */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Performance</span>
                          <span className="font-medium">{performanceScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              performanceScore >= 80 ? 'bg-green-500' :
                              performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${performanceScore}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Tasks Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-gray-50 rounded p-2">
                          <div className="font-semibold text-gray-900">{agentTasks.length}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <div className="font-semibold text-green-600">
                            {agentTasks.filter(t => t.status === 'completed').length}
                          </div>
                          <div className="text-xs text-gray-500">Done</div>
                        </div>
                        <div className="bg-blue-50 rounded p-2">
                          <div className="font-semibold text-blue-600">
                            {agentTasks.filter(t => t.status === 'running').length}
                          </div>
                          <div className="text-xs text-gray-500">Active</div>
                        </div>
                      </div>

                      {/* Capabilities */}
                      {capabilities.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <WrenchScrewdriverIcon className="w-4 h-4 mr-1" />
                            Capabilities
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {capabilities.slice(0, 3).map(capability => (
                              <span key={capability} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {capability.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            ))}
                            {capabilities.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                +{capabilities.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2">
                        <button
                          onClick={() => setSelectedAgent(selectedAgent === index ? null : index)}
                          className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {selectedAgent === index ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>

                      {/* Expanded Details */}
                      {selectedAgent === index && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700">Full ID</h5>
                            <p className="text-xs text-gray-600 font-mono break-all">{agent.id.id}</p>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium text-gray-700">Swarm ID</h5>
                            <p className="text-xs text-gray-600 font-mono break-all">{agent.id.swarmId}</p>
                          </div>

                          {capabilities.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700">All Capabilities</h5>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {capabilities.map(capability => (
                                  <span key={capability} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                    {capability.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {agentTasks.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700">Recent Tasks</h5>
                              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                                {agentTasks.slice(0, 5).map(task => (
                                  <div key={task.id.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                                    <span className="truncate flex-1 mr-2">{task.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${getAgentStatusColor(task.status)}`}>
                                      {task.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h5 className="text-sm font-medium text-gray-700">Environment</h5>
                            <div className="text-xs text-gray-600 mt-1">
                              <div>Credentials: {agent.environment?.credentials ? Object.keys(agent.environment.credentials).length : 0} configured</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsPage;
import React, { useState, useEffect } from 'react';
import { getAgents } from '../services/api';

const AgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const data = await getAgents();
        setAgents(data.agents || []);
      } catch (err) {
        setError('Failed to load agents');
        console.error('Agents error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agents</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage AI agents and their configurations
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.length > 0 ? agents.map((agent, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {agent.name || `Agent ${index + 1}`}
              </h3>
              <span className={`w-3 h-3 rounded-full ${
                agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}></span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {agent.type || 'General Agent'}
            </p>
            <div className="mt-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Tasks: {agent.tasksCompleted || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Uptime: {agent.uptime || '0h'}
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-3 text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No agents configured</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsPage;
