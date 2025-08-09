import React, { useState, useEffect, useRef } from 'react';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
  CpuChipIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';

const SearchBar = ({ 
  placeholder = "Search everything...", 
  className = "",
  autoFocus = false,
  onResultClick = null
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();
  const { tasks, agents, models } = useWebSocket();

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('claude-flow-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      performSearch(query);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
    setSelectedIndex(-1);
  }, [query, tasks, agents, models]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const performSearch = (searchQuery) => {
    const searchResults = [];
    const lowerQuery = searchQuery.toLowerCase();

    // Search tasks
    tasks.forEach(task => {
      if (task.name.toLowerCase().includes(lowerQuery) || 
          task.description.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'task',
          id: task.id.id,
          title: task.name,
          subtitle: task.description,
          status: task.status,
          url: '/tasks',
          icon: DocumentTextIcon
        });
      }
    });

    // Search agents
    agents.forEach(agent => {
      if (agent.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'agent',
          id: agent.id.id,
          title: agent.name,
          subtitle: `${agent.type} agent - ${agent.status}`,
          status: agent.status,
          url: '/agents',
          icon: UserGroupIcon
        });
      }
    });

    // Search models
    models.forEach(model => {
      if (model.model.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'model',
          id: model.model,
          title: model.model,
          subtitle: `${model.provider} provider`,
          status: 'available',
          url: '/models',
          icon: CpuChipIcon
        });
      }
    });

    // Quick actions
    const quickActions = [
      { title: 'Create New Task', url: '/tasks', action: 'create-task' },
      { title: 'View System Status', url: '/system', action: 'system-status' },
      { title: 'Configure API Keys', url: '/config', action: 'api-keys' },
      { title: 'View Analytics', url: '/analytics', action: 'analytics' }
    ];

    quickActions.forEach(action => {
      if (action.title.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'action',
          id: action.action,
          title: action.title,
          subtitle: 'Quick Action',
          url: action.url,
          icon: ClockIcon
        });
      }
    });

    // Limit results
    setResults(searchResults.slice(0, 10));
  };

  const handleResultClick = (result) => {
    // Save to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('claude-flow-recent-searches', JSON.stringify(newRecentSearches));

    // Handle click
    if (onResultClick) {
      onResultClick(result);
    } else {
      navigate(result.url);
    }

    // Close search
    setQuery('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'active':
      case 'available':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                    index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <result.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      {result.status && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(result.status)}`}>
                          {result.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No results found for "{query}"
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <ClockIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{search}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;