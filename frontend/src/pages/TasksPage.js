
import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getTasks, createTask, deleteTask, batchCreateTasks, batchDeleteTasks, getModels } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../contexts/NotificationContext';

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState('desc');

  const { subscribe, isConnected } = useWebSocket();
  const { addNotification } = useNotification();

  // Task templates
  const taskTemplates = [
    {
      name: 'Code Review',
      description: 'Review code for bugs, security issues, and best practices',
      instructions: 'Please review the following code and provide feedback on:\n- Code quality and structure\n- Potential bugs or security issues\n- Performance optimizations\n- Best practices adherence',
      priority: 'normal',
      model: 'anthropic/claude-3-sonnet'
    },
    {
      name: 'API Documentation',
      description: 'Generate comprehensive API documentation',
      instructions: 'Create detailed API documentation including:\n- Endpoint descriptions\n- Request/response examples\n- Authentication requirements\n- Error handling',
      priority: 'normal',
      model: 'openai/gpt-4-turbo'
    },
    {
      name: 'Data Analysis',
      description: 'Analyze data and provide insights',
      instructions: 'Perform data analysis on the provided dataset:\n- Statistical summary\n- Pattern identification\n- Trend analysis\n- Recommendations based on findings',
      priority: 'high',
      model: 'openrouter/auto'
    },
    {
      name: 'Content Writing',
      description: 'Create engaging content for various purposes',
      instructions: 'Write high-quality content that:\n- Matches the target audience\n- Follows brand guidelines\n- Is SEO optimized\n- Includes compelling calls-to-action',
      priority: 'normal',
      model: 'anthropic/claude-3-haiku'
    }
  ];

  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    instructions: '',
    model: '',
    priority: 'normal'
  });

  const [bulkTasks, setBulkTasks] = useState('');

  // Load tasks and models
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, modelsRes] = await Promise.all([
        getTasks({ status: filterStatus !== 'all' ? filterStatus : undefined }),
        getModels()
      ]);
      
      setTasks(tasksRes.data?.tasks || []);
      setModels(modelsRes.data?.models || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      addNotification('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, addNotification]);

  // WebSocket subscriptions
  useEffect(() => {
    const unsubscriptions = [];

    unsubscriptions.push(subscribe('task_created', (message) => {
      setTasks(prev => [message.data.task, ...prev]);
      addNotification(`Task "${message.data.task.name}" created successfully`, 'success');
    }));

    unsubscriptions.push(subscribe('task_updated', (message) => {
      setTasks(prev => prev.map(task => 
        task.id === message.data.taskId 
          ? { ...task, ...message.data.updates }
          : task
      ));
    }));

    unsubscriptions.push(subscribe('task_completed', (message) => {
      setTasks(prev => prev.map(task => 
        task.id === message.data.taskId 
          ? { ...task, ...message.data.task }
          : task
      ));
      addNotification(`Task "${message.data.task.name}" completed`, 'success');
    }));

    unsubscriptions.push(subscribe('task_failed', (message) => {
      setTasks(prev => prev.map(task => 
        task.id === message.data.taskId 
          ? { ...task, status: 'failed', error: message.data.error }
          : task
      ));
      addNotification(`Task failed: ${message.data.error.message}`, 'error');
    }));

    unsubscriptions.push(subscribe('task_deleted', (message) => {
      setTasks(prev => prev.filter(task => task.id !== message.data.taskId));
      addNotification('Task deleted successfully', 'success');
    }));

    return () => unsubscriptions.forEach(unsub => unsub());
  }, [subscribe, addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search) ||
        task.instructions.toLowerCase().includes(search)
      );
    }

    // Sort tasks
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'created') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tasks, filterStatus, filterPriority, searchTerm, sortBy, sortOrder]);

  // Handle task creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.name.trim() || !newTask.instructions.trim()) {
      addNotification('Please fill in required fields', 'error');
      return;
    }

    try {
      setCreating(true);
      await createTask(newTask);
      setNewTask({
        name: '',
        description: '',
        instructions: '',
        model: '',
        priority: 'normal'
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
      addNotification('Failed to create task', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Handle bulk task creation
  const handleBulkCreate = async () => {
    if (!bulkTasks.trim()) {
      addNotification('Please enter task data', 'error');
      return;
    }

    try {
      setCreating(true);
      const tasks = bulkTasks.split('\n').filter(line => line.trim()).map(line => {
        const [name, description = '', priority = 'normal'] = line.split('|').map(s => s.trim());
        return {
          name,
          description,
          instructions: description || `Complete task: ${name}`,
          priority,
          model: 'openrouter/auto'
        };
      });

      await batchCreateTasks(tasks);
      setBulkTasks('');
      setShowBulkModal(false);
      addNotification(`Created ${tasks.length} tasks successfully`, 'success');
    } catch (error) {
      console.error('Error creating bulk tasks:', error);
      addNotification('Failed to create bulk tasks', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
      addNotification('Failed to delete task', 'error');
    }
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) {
      addNotification('No tasks selected', 'error');
      return;
    }

    try {
      await batchDeleteTasks(Array.from(selectedTasks));
      setSelectedTasks(new Set());
      addNotification(`Deleted ${selectedTasks.size} tasks successfully`, 'success');
    } catch (error) {
      console.error('Error deleting tasks:', error);
      addNotification('Failed to delete tasks', 'error');
    }
  };

  // Handle task selection
  const handleTaskSelect = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // Select all tasks
  const handleSelectAll = () => {
    if (selectedTasks.size === filteredAndSortedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredAndSortedTasks.map(task => task.id)));
    }
  };

  // Apply template
  const applyTemplate = (template) => {
    setNewTask({
      ...newTask,
      ...template
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'created': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-200';
      case 'high': return 'text-orange-700 bg-orange-200';
      case 'normal': return 'text-blue-700 bg-blue-200';
      case 'low': return 'text-gray-700 bg-gray-200';
      default: return 'text-gray-700 bg-gray-200';
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor your AI tasks ({filteredAndSortedTasks.length} total)
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Bulk Create
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Task
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="created">Created</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="created">Created</option>
                <option value="name">Name</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTasks.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedTasks.size} tasks selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {filteredAndSortedTasks.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Header */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select All
                </span>
              </div>
            </div>
            
            {filteredAndSortedTasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => handleTaskSelect(task.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {task.name}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.model && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Model: {task.model}
                            </span>
                          )}
                          {task.metrics?.duration && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Duration: {task.metrics.duration}ms
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Created: {new Date(task.created).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {task.status === 'running' && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new task
            </p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Task</h2>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              {/* Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quick Templates
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {taskTemplates.map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Task Name *
                </label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instructions *
                </label>
                <textarea
                  value={newTask.instructions}
                  onChange={(e) => setNewTask({...newTask, instructions: e.target.value})}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Model
                  </label>
                  <select
                    value={newTask.model}
                    onChange={(e) => setNewTask({...newTask, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Auto-select</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Create Tasks</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Enter one task per line in format: Name | Description | Priority
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <textarea
                value={bulkTasks}
                onChange={(e) => setBulkTasks(e.target.value)}
                rows={10}
                placeholder="Task 1 | Complete code review | high&#10;Task 2 | Write documentation | normal&#10;Task 3 | Fix bug in authentication | critical"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkCreate}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Tasks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
