import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  className = '',
  message = null,
  overlay = false 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  const spinner = (
    <div className={`flex items-center justify-center ${overlay ? 'space-y-4' : 'space-x-2'} ${className}`}>
      <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}>
        <svg fill="none" viewBox="0 0 24 24">
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {message && (
        <span className={`text-sm font-medium ${colorClasses[color]} ${overlay ? 'block' : ''}`}>
          {message}
        </span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

// Specialized loading components
export const PageLoader = ({ message = "Loading page..." }) => (
  <div className="flex items-center justify-center min-h-64 py-12">
    <LoadingSpinner size="lg" message={message} className="flex-col space-y-4" />
  </div>
);

export const TableLoader = ({ rows = 5 }) => (
  <div className="animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="border-b border-gray-200 py-4">
        <div className="flex items-center space-x-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/5"></div>
          <div className="h-4 bg-gray-200 rounded w-1/6"></div>
        </div>
      </div>
    ))}
  </div>
);

export const CardLoader = () => (
  <div className="animate-pulse">
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

export const ChartLoader = () => (
  <div className="animate-pulse">
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-100 rounded flex items-end justify-between p-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div 
            key={i} 
            className="bg-gray-200 rounded-t" 
            style={{ 
              height: `${Math.random() * 80 + 20}%`, 
              width: '12%' 
            }}
          ></div>
        ))}
      </div>
    </div>
  </div>
);

export default LoadingSpinner;