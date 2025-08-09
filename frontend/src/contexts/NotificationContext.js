import React, { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon 
} from '@heroicons/react/24/outline';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Enhanced toast configurations
  const toastConfig = {
    duration: 4000,
    position: 'top-right',
    style: {
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      maxWidth: '400px'
    }
  };

  const addNotification = useCallback((notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = {
      id,
      timestamp: new Date().toISOString(),
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 99)]); // Keep only last 100
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Success notification
  const success = useCallback((message, options = {}) => {
    const notification = {
      type: 'success',
      title: options.title || 'Success',
      message,
      ...options
    };

    const id = addNotification(notification);

    toast.success(
      <div className="flex items-start space-x-3">
        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-sm font-medium text-gray-900 mb-1">
              {notification.title}
            </p>
          )}
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>,
      {
        ...toastConfig,
        duration: options.duration || toastConfig.duration,
        style: {
          ...toastConfig.style,
          background: '#f0f9ff',
          border: '1px solid #10b981',
          color: '#065f46'
        }
      }
    );

    return id;
  }, [addNotification]);

  // Error notification
  const error = useCallback((message, options = {}) => {
    const notification = {
      type: 'error',
      title: options.title || 'Error',
      message,
      ...options
    };

    const id = addNotification(notification);

    toast.error(
      <div className="flex items-start space-x-3">
        <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-sm font-medium text-gray-900 mb-1">
              {notification.title}
            </p>
          )}
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>,
      {
        ...toastConfig,
        duration: options.duration || 6000, // Longer for errors
        style: {
          ...toastConfig.style,
          background: '#fef2f2',
          border: '1px solid #ef4444',
          color: '#991b1b'
        }
      }
    );

    return id;
  }, [addNotification]);

  // Warning notification
  const warning = useCallback((message, options = {}) => {
    const notification = {
      type: 'warning',
      title: options.title || 'Warning',
      message,
      ...options
    };

    const id = addNotification(notification);

    toast(
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-sm font-medium text-gray-900 mb-1">
              {notification.title}
            </p>
          )}
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>,
      {
        ...toastConfig,
        duration: options.duration || 5000,
        style: {
          ...toastConfig.style,
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          color: '#92400e'
        }
      }
    );

    return id;
  }, [addNotification]);

  // Info notification
  const info = useCallback((message, options = {}) => {
    const notification = {
      type: 'info',
      title: options.title || 'Information',
      message,
      ...options
    };

    const id = addNotification(notification);

    toast(
      <div className="flex items-start space-x-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-sm font-medium text-gray-900 mb-1">
              {notification.title}
            </p>
          )}
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>,
      {
        ...toastConfig,
        duration: options.duration || toastConfig.duration,
        style: {
          ...toastConfig.style,
          background: '#eff6ff',
          border: '1px solid #3b82f6',
          color: '#1e40af'
        }
      }
    );

    return id;
  }, [addNotification]);

  // Loading notification (with promise support)
  const loading = useCallback((message, promise, options = {}) => {
    if (promise) {
      return toast.promise(
        promise,
        {
          loading: message,
          success: (data) => options.successMessage || 'Operation completed successfully',
          error: (err) => options.errorMessage || `Operation failed: ${err.message}`
        },
        {
          ...toastConfig,
          style: {
            ...toastConfig.style,
            background: '#f8fafc',
            border: '1px solid #64748b'
          }
        }
      );
    }

    const id = toast.loading(message, {
      ...toastConfig,
      style: {
        ...toastConfig.style,
        background: '#f8fafc',
        border: '1px solid #64748b'
      }
    });

    addNotification({
      type: 'loading',
      title: 'Loading',
      message,
      ...options
    });

    return id;
  }, [addNotification]);

  // Custom notification
  const custom = useCallback((component, options = {}) => {
    const id = toast.custom(component, {
      ...toastConfig,
      ...options
    });

    addNotification({
      type: 'custom',
      message: 'Custom notification',
      ...options
    });

    return id;
  }, [addNotification]);

  // Dismiss notification
  const dismiss = useCallback((toastId) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }, []);

  // Notification for task status updates
  const taskUpdate = useCallback((task, status) => {
    const messages = {
      created: `Task "${task.name}" has been created`,
      running: `Task "${task.name}" is now running`,
      completed: `Task "${task.name}" completed successfully`,
      failed: `Task "${task.name}" failed to complete`,
      cancelled: `Task "${task.name}" was cancelled`
    };

    const types = {
      created: 'info',
      running: 'info',
      completed: 'success',
      failed: 'error',
      cancelled: 'warning'
    };

    const notificationType = types[status] || 'info';
    const message = messages[status] || `Task "${task.name}" status: ${status}`;

    return notificationType === 'success' ? success(message) :
           notificationType === 'error' ? error(message) :
           notificationType === 'warning' ? warning(message) :
           info(message);
  }, [success, error, warning, info]);

  // System notification
  const system = useCallback((message, level = 'info', options = {}) => {
    const systemOptions = {
      ...options,
      title: options.title || 'System Notification',
      duration: options.duration || (level === 'error' ? 8000 : 5000)
    };

    switch (level) {
      case 'error':
        return error(message, systemOptions);
      case 'warning':
        return warning(message, systemOptions);
      case 'success':
        return success(message, systemOptions);
      default:
        return info(message, systemOptions);
    }
  }, [success, error, warning, info]);

  const value = {
    notifications,
    success,
    error,
    warning,
    info,
    loading,
    custom,
    dismiss,
    taskUpdate,
    system,
    addNotification,
    removeNotification,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
import React, { createContext, useContext, useState } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now().toString();
    const newNotification = { id, ...notification };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Show toast
    switch (notification.type) {
      case 'success':
        toast.success(notification.message);
        break;
      case 'error':
        toast.error(notification.message);
        break;
      case 'warning':
        toast(notification.message, { icon: '⚠️' });
        break;
      default:
        toast(notification.message);
    }

    // Auto remove after duration
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration || 5000);

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    toast.dismiss();
  };

  const success = (message, options = {}) => {
    return addNotification({ type: 'success', message, ...options });
  };

  const error = (message, options = {}) => {
    return addNotification({ type: 'error', message, ...options });
  };

  const warning = (message, options = {}) => {
    return addNotification({ type: 'warning', message, ...options });
  };

  const info = (message, options = {}) => {
    return addNotification({ type: 'info', message, ...options });
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
