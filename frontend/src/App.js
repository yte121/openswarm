import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';
import { WebSocketProvider } from './hooks/useWebSocket';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { healthCheck } from './services/api';
import './App.css';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ModelsPage = React.lazy(() => import('./pages/ModelsPage'));
const TasksPage = React.lazy(() => import('./pages/TasksPage'));
const AgentsPage = React.lazy(() => import('./pages/AgentsPage'));
const ConfigPage = React.lazy(() => import('./pages/ConfigPage'));
const SystemPage = React.lazy(() => import('./pages/SystemPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));

// App Content Component (to use hooks inside providers)
const AppContent = () => {
  const [isHealthy, setIsHealthy] = useState(null);
  const [appVersion] = useState('2.0.0-alpha.84');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  useEffect(() => {
    // Initial health check
    checkSystemHealth();
    
    // Set up offline/online detection
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Periodic health check
    const healthInterval = setInterval(checkSystemHealth, 30000);
    
    // Performance monitoring
    if (process.env.NODE_ENV === 'production') {
      reportWebVitals();
    }

    // Load sidebar preference
    const savedSidebarState = localStorage.getItem('claude-flow-sidebar-collapsed');
    if (savedSidebarState) {
      setSidebarCollapsed(JSON.parse(savedSidebarState));
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthInterval);
    };
  }, []);

  const checkSystemHealth = async () => {
    try {
      await healthCheck();
      setIsHealthy(true);
    } catch (error) {
      console.warn('Health check failed:', error.message);
      setIsHealthy(false);
    }
  };

  const reportWebVitals = () => {
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });
    }
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('claude-flow-sidebar-collapsed', JSON.stringify(newState));
  };

  // Loading fallback component
  const LoadingFallback = ({ message = "Loading..." }) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{message}</p>
      </div>
    </div>
  );

  // System health banner
  const HealthBanner = () => {
    if (isHealthy === null) return null;
    
    if (!isHealthy || isOffline) {
      return (
        <div className="bg-red-600 text-white px-4 py-2 text-sm text-center relative z-30">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              {isOffline ? 'System is offline - Some features may be unavailable' : 'Backend service unavailable - Please check system status'}
            </span>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <HealthBanner />
      
      {/* Sidebar */}
      <Sidebar 
        appVersion={appVersion} 
        isHealthy={isHealthy}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      
      {/* Main Content */}
      <main className={`flex-1 relative overflow-y-auto focus:outline-none transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <ErrorBoundary fallback={
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-red-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Page Error</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Something went wrong loading this page.</p>
                <div className="mt-6">
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            }>
              <Suspense fallback={<LoadingFallback message="Loading page..." />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/models" element={<ModelsPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/config" element={<ConfigPage />} />
                  <Route path="/system" element={<SystemPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  
                  {/* Catch-all route for 404 */}
                  <Route path="*" element={
                    <div className="text-center py-12">
                      <div className="mx-auto h-12 w-12 text-gray-400">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Page Not Found</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The page you're looking for doesn't exist.</p>
                      <div className="mt-6">
                        <button
                          onClick={() => window.history.back()}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                          Go Back
                        </button>
                      </div>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg, #363636)',
            color: 'var(--toast-color, #fff)',
            maxWidth: '500px',
          },
          success: {
            style: {
              background: 'var(--toast-success-bg, #10b981)',
            },
            iconTheme: {
              primary: 'var(--toast-success-icon, #fff)',
              secondary: 'var(--toast-success-bg, #10b981)',
            },
          },
          error: {
            style: {
              background: 'var(--toast-error-bg, #ef4444)',
            },
            iconTheme: {
              primary: 'var(--toast-error-icon, #fff)',
              secondary: 'var(--toast-error-bg, #ef4444)',
            },
          },
          loading: {
            style: {
              background: 'var(--toast-loading-bg, #3b82f6)',
            },
          },
        }}
      />
      
      {/* PWA Install prompt */}
      {process.env.REACT_APP_PWA_ENABLED === 'true' && (
        <div id="pwa-install-prompt" className="hidden fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 max-w-sm z-50">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Install Claude-Flow Dashboard
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get quick access from your home screen
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                onClick={() => document.getElementById('pwa-install-prompt').style.display = 'none'}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <WebSocketProvider>
            <Router>
              <AppContent />
            </Router>
          </WebSocketProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;