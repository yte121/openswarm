import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import { refreshModels } from '../services/api';
import toast from 'react-hot-toast';

const ModelsPage = () => {
  const { models, setModels } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [expandedModel, setExpandedModel] = useState(null);

  useEffect(() => {
    if (models.length === 0) {
      handleRefreshModels();
    }
  }, []);

  const handleRefreshModels = async () => {
    setLoading(true);
    try {
      const response = await refreshModels();
      setModels(response.data.models || []);
      toast.success(`Loaded ${response.data.models?.length || 0} models`);
    } catch (error) {
      toast.error('Failed to refresh models');
      console.error('Error refreshing models:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProviders = () => {
    const providers = [...new Set(models.map(model => model.provider))];
    return providers.sort();
  };

  const getModelCategories = () => {
    const categories = [...new Set(models.map(model => {
      const modelName = model.model.toLowerCase();
      if (modelName.includes('gpt') || modelName.includes('claude') || modelName.includes('chat')) {
        return 'chat';
      } else if (modelName.includes('embed')) {
        return 'embedding';
      } else if (modelName.includes('vision') || modelName.includes('image')) {
        return 'vision';
      } else if (modelName.includes('code')) {
        return 'code';
      } else if (modelName.includes('instruct')) {
        return 'instruct';
      }
      return 'general';
    }))];
    return categories.sort();
  };

  const filteredModels = models.filter(model => {
    const matchesSearch = model.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = selectedProvider === 'all' || model.provider === selectedProvider;
    const modelCategory = (() => {
      const modelName = model.model.toLowerCase();
      if (modelName.includes('gpt') || modelName.includes('claude') || modelName.includes('chat')) return 'chat';
      if (modelName.includes('embed')) return 'embedding';
      if (modelName.includes('vision') || modelName.includes('image')) return 'vision';
      if (modelName.includes('code')) return 'code';
      if (modelName.includes('instruct')) return 'instruct';
      return 'general';
    })();
    const matchesCategory = selectedCategory === 'all' || modelCategory === selectedCategory;
    
    return matchesSearch && matchesProvider && matchesCategory;
  });

  const sortedModels = [...filteredModels].sort((a, b) => {
    let aValue = a[sortBy] || a.model;
    let bValue = b[sortBy] || b.model;
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getModelIcon = (modelName) => {
    const name = modelName.toLowerCase();
    if (name.includes('gpt')) return '🤖';
    if (name.includes('claude')) return '🧠';
    if (name.includes('llama')) return '🦙';
    if (name.includes('mistral')) return '🌪️';
    if (name.includes('gemini')) return '💎';
    if (name.includes('embed')) return '📊';
    if (name.includes('vision')) return '👁️';
    if (name.includes('code')) return '💻';
    return '⚡';
  };

  const getModelTypeColor = (modelName) => {
    const name = modelName.toLowerCase();
    if (name.includes('gpt')) return 'bg-green-100 text-green-800';
    if (name.includes('claude')) return 'bg-purple-100 text-purple-800';
    if (name.includes('llama')) return 'bg-orange-100 text-orange-800';
    if (name.includes('mistral')) return 'bg-blue-100 text-blue-800';
    if (name.includes('gemini')) return 'bg-pink-100 text-pink-800';
    if (name.includes('embed')) return 'bg-indigo-100 text-indigo-800';
    if (name.includes('vision')) return 'bg-yellow-100 text-yellow-800';
    if (name.includes('code')) return 'bg-gray-100 text-gray-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Models</h1>
          <p className="text-gray-600 mt-1">Browse and manage available AI models across providers</p>
        </div>
        <button
          onClick={handleRefreshModels}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Models'}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{models.length}</div>
          <div className="text-sm text-gray-500">Total Models</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{getProviders().length}</div>
          <div className="text-sm text-gray-500">Providers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{sortedModels.length}</div>
          <div className="text-sm text-gray-500">Filtered Results</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{getModelCategories().length}</div>
          <div className="text-sm text-gray-500">Categories</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Provider Filter */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Providers</option>
            {getProviders().map(provider => (
              <option key={provider} value={provider} className="capitalize">{provider}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {getModelCategories().map(category => (
              <option key={category} value={category} className="capitalize">{category}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="model-asc">Name (A-Z)</option>
            <option value="model-desc">Name (Z-A)</option>
            <option value="provider-asc">Provider (A-Z)</option>
            <option value="provider-desc">Provider (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Models List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading models...</span>
          </div>
        ) : sortedModels.length === 0 ? (
          <div className="text-center py-12">
            <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No models found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or refresh the models list.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                <div className="col-span-5 flex items-center space-x-2">
                  <button
                    onClick={() => handleSort('model')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Model</span>
                    {sortBy === 'model' && (
                      sortOrder === 'asc' ? 
                        <ChevronUpIcon className="w-4 h-4" /> : 
                        <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="col-span-2 flex items-center space-x-2">
                  <button
                    onClick={() => handleSort('provider')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Provider</span>
                    {sortBy === 'provider' && (
                      sortOrder === 'asc' ? 
                        <ChevronUpIcon className="w-4 h-4" /> : 
                        <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>
            </div>

            {/* Model Rows */}
            <div className="divide-y divide-gray-200">
              {sortedModels.map((model, index) => (
                <div key={`${model.provider}-${model.model}-${index}`} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getModelIcon(model.model)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {model.model}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {model.model.split('/')[1] || model.model}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {model.provider}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModelTypeColor(model.model)}`}>
                        {(() => {
                          const name = model.model.toLowerCase();
                          if (name.includes('gpt') || name.includes('claude') || name.includes('chat')) return 'Chat';
                          if (name.includes('embed')) return 'Embedding';
                          if (name.includes('vision')) return 'Vision';
                          if (name.includes('code')) return 'Code';
                          if (name.includes('instruct')) return 'Instruct';
                          return 'General';
                        })()}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                        Available
                      </span>
                    </div>

                    <div className="col-span-1">
                      <button
                        onClick={() => setExpandedModel(expandedModel === index ? null : index)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {expandedModel === index ? 'Less' : 'Details'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedModel === index && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Full ID:</span>
                          <p className="text-gray-600 break-all">{model.model}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Provider:</span>
                          <p className="text-gray-600 capitalize">{model.provider}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Type:</span>
                          <p className="text-gray-600">
                            {(() => {
                              const name = model.model.toLowerCase();
                              if (name.includes('gpt') || name.includes('claude') || name.includes('chat')) return 'Conversational AI';
                              if (name.includes('embed')) return 'Text Embeddings';
                              if (name.includes('vision')) return 'Vision & Image Processing';
                              if (name.includes('code')) return 'Code Generation & Analysis';
                              if (name.includes('instruct')) return 'Instruction Following';
                              return 'General Purpose AI';
                            })()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Capabilities:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(() => {
                              const name = model.model.toLowerCase();
                              const caps = [];
                              if (name.includes('chat') || name.includes('gpt') || name.includes('claude')) caps.push('Chat');
                              if (name.includes('code')) caps.push('Code');
                              if (name.includes('vision')) caps.push('Vision');
                              if (name.includes('embed')) caps.push('Embeddings');
                              if (caps.length === 0) caps.push('Text');
                              
                              return caps.map(cap => (
                                <span key={cap} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {cap}
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Status:</span>
                          <p className="text-green-600">✓ Ready for use</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Last Updated:</span>
                          <p className="text-gray-600">Just now</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelsPage;
import React, { useState, useEffect } from 'react';
import { getModels } from '../services/api';

const ModelsPage = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const data = await getModels();
        setModels(data.models || []);
      } catch (err) {
        setError('Failed to load models');
        console.error('Models error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Models</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage and configure AI models
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.length > 0 ? models.map((model, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{model.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{model.provider}</p>
            <div className="mt-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                model.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {model.status || 'available'}
              </span>
            </div>
          </div>
        )) : (
          <div className="col-span-3 text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No models configured</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelsPage;
