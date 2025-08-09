// Performance optimization utilities

// Debounce function for search and input handling
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function for scroll and resize events
export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Measure and log performance
export const measurePerformance = (name, fn) => {
  return async (...args) => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  };
};

// Lazy loading utility for images
export const lazyLoadImage = (src, placeholder = '/api/placeholder/400/300') => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(placeholder); // Fallback to placeholder
    img.src = src;
  });
};

// Virtual scrolling helper
export class VirtualScrollManager {
  constructor(containerHeight, itemHeight, overscan = 5) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
    this.overscan = overscan;
  }

  getVisibleRange(scrollTop, totalItems) {
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.containerHeight / this.itemHeight),
      totalItems - 1
    );

    return {
      startIndex: Math.max(0, startIndex - this.overscan),
      endIndex: Math.min(totalItems - 1, endIndex + this.overscan),
      totalHeight: totalItems * this.itemHeight
    };
  }
}

// Memory optimization utilities
export const memoryOptimization = {
  // Weak references for cleanup
  createWeakRef: (obj) => {
    return typeof WeakRef !== 'undefined' ? new WeakRef(obj) : { deref: () => obj };
  },

  // Cleanup function for removing event listeners
  createCleanupTracker: () => {
    const cleanupTasks = [];
    return {
      add: (cleanup) => cleanupTasks.push(cleanup),
      cleanup: () => {
        cleanupTasks.forEach(task => {
          try {
            task();
          } catch (error) {
            console.warn('Cleanup task failed:', error);
          }
        });
        cleanupTasks.length = 0;
      }
    };
  }
};

// Bundle size optimization
export const dynamicImport = (path) => {
  return import(path).catch(error => {
    console.error(`Failed to load module: ${path}`, error);
    return null;
  });
};

// Performance monitoring
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.startTime = performance.now();
  }

  // Mark performance milestones
  mark(name) {
    const time = performance.now();
    this.metrics.set(name, time);
    
    if (typeof performance.mark === 'function') {
      performance.mark(name);
    }
    
    return time;
  }

  // Measure time between marks
  measure(name, startMark, endMark) {
    const startTime = this.metrics.get(startMark) || this.startTime;
    const endTime = this.metrics.get(endMark) || performance.now();
    const duration = endTime - startTime;
    
    this.metrics.set(name, duration);
    
    if (typeof performance.measure === 'function') {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        console.warn('Performance measure failed:', error);
      }
    }
    
    return duration;
  }

  // Get all metrics
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Monitor Core Web Vitals
  observeWebVitals() {
    if (typeof PerformanceObserver === 'undefined') return;

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.set('LCP', lastEntry.startTime);
    });

    // First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        this.metrics.set('FID', entry.processingStart - entry.startTime);
      });
    });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.metrics.set('CLS', clsValue);
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      
      this.observers.push(lcpObserver, fidObserver, clsObserver);
    } catch (error) {
      console.warn('Web Vitals observation failed:', error);
    }
  }

  // Monitor resource loading
  observeResources() {
    if (typeof PerformanceObserver === 'undefined') return;

    const resourceObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (entry.name.includes('static/') || entry.name.includes('api/')) {
          this.metrics.set(`resource:${entry.name}`, {
            duration: entry.duration,
            size: entry.transferSize,
            type: entry.initiatorType
          });
        }
      });
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource observation failed:', error);
    }
  }

  // Stop all observers
  disconnect() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Observer disconnect failed:', error);
      }
    });
    this.observers.length = 0;
  }
}

// React-specific optimizations
export const reactOptimizations = {
  // Memoization helper
  createMemoizedSelector: (selector) => {
    let lastArgs = [];
    let lastResult;
    
    return (...args) => {
      if (args.length !== lastArgs.length || args.some((arg, i) => arg !== lastArgs[i])) {
        lastArgs = args;
        lastResult = selector(...args);
      }
      return lastResult;
    };
  },

  // Component update optimization
  shouldComponentUpdate: (prevProps, nextProps, keys) => {
    if (!keys) {
      return JSON.stringify(prevProps) !== JSON.stringify(nextProps);
    }
    
    return keys.some(key => prevProps[key] !== nextProps[key]);
  },

  // Batch state updates
  batchStateUpdates: (updates) => {
    if (typeof React !== 'undefined' && React.unstable_batchedUpdates) {
      React.unstable_batchedUpdates(() => {
        updates.forEach(update => update());
      });
    } else {
      updates.forEach(update => update());
    }
  }
};

// Initialize global performance monitor
export const globalPerformanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  globalPerformanceMonitor.observeWebVitals();
  globalPerformanceMonitor.observeResources();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalPerformanceMonitor.disconnect();
  });
}

export default {
  debounce,
  throttle,
  measurePerformance,
  lazyLoadImage,
  VirtualScrollManager,
  memoryOptimization,
  dynamicImport,
  PerformanceMonitor,
  globalPerformanceMonitor,
  reactOptimizations
};