import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';

const SearchBar = ({ 
  placeholder = "Search tasks, agents, models...", 
  className = '',
  onSearchResults = null,
  globalSearch = true 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const { tasks, agents, models } = useWebSocket();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() && globalSearch) {
      performSearch(searchTerm);
    } else {
      setResults([]);
    }
  }, [searchTerm, tasks, agents, models, globalSearch]);

  const performSearch = async (query) => {
    setLoading(true);
    const searchResults = [];

    try {
      const lowercaseQuery = query.toLowerCase();

      // Search tasks
      const taskResults = tasks.filter(task =>
        task.name.toLowerCase().includes(lowercaseQuery) ||
        task.description.toLowerCase().includes(lowercaseQuery) ||
        task.instructions.toLowerCase().includes(lowercaseQuery)
      ).map(task => ({
        type: 'task',
        id: task.id.id,
        title: task.name,
        subtitle: task.description,
        status: task.status,
        href: '/tasks',
        icon: '📝'
      }));

      // Search agents
      const agentResults = agents.filter(agent =>
        agent.name.toLowerCase().includes(lowercaseQuery) ||
        agent.type.toLowerCase().includes(lowercaseQuery)
      ).map(agent => ({
        type: 'agent',
        id: agent.id.id,
        title: agent.name,
        subtitle: `${agent.type} agent`,
        status: agent.status,
        href: '/agents',
        icon: '🤖'
      }));

      // Search models
      const modelResults = models.filter(model =>
        model.model.toLowerCase().includes(lowercaseQuery) ||
        model.provider.toLowerCase().includes(lowercaseQuery)
      ).map(model => ({
        type: 'model',
        id: model.model,
        title: model.model,
        subtitle: `${model.provider} provider`,
        status: 'available',
        href: '/models',
        icon: '🧠'
      }));

      searchResults.push(...taskResults, ...agentResults, ...modelResults);
      
      // Sort by relevance (exact matches first, then partial matches)
      searchResults.sort((a, b) => {
        const aExact = a.title.toLowerCase() === lowercaseQuery;
        const bExact = b.title.toLowerCase() === lowercaseQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.title.localeCompare(b.title);
      });

      setResults(searchResults.slice(0, 10)); // Limit to 10 results
      
      if (onSearchResults) {
        onSearchResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(value.trim().length > 0);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setIsOpen(false);
  };

  const handleResultClick = (result) => {
    setIsOpen(false);
    // The href will be handled by the parent component or router
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'active':
      case 'available':
        return 'text-green-600';
      case 'running':
        return 'text-blue-600';
      case 'failed':
      case 'error':
        return 'text-red-600';
      case 'idle':
      case 'created':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => searchTerm.trim() && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (searchTerm.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Searching...</p>
            </div>
          )}

          {!loading && results.length === 0 && searchTerm.trim() && (
            <div className="p-4 text-center text-gray-500">
              No results found for "{searchTerm}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                Search Results ({results.length})
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <span className="text-lg">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      <span className={`text-xs font-medium ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 uppercase">
                    {result.type}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {searchTerm.trim() && (
            <div className="border-t border-gray-200 dark:border-gray-600 p-2">
              <div className="text-xs text-gray-500 px-2 py-1">Quick Actions</div>
              <button className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                Create task with "{searchTerm}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;