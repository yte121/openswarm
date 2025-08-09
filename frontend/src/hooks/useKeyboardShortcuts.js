import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { info } = useNotification();

  // Keyboard shortcuts configuration
  const shortcuts = {
    // Navigation shortcuts
    'g,d': () => navigate('/'),
    'g,m': () => navigate('/models'),
    'g,t': () => navigate('/tasks'),
    'g,a': () => navigate('/agents'),
    'g,s': () => navigate('/system'),
    'g,c': () => navigate('/config'),
    'g,y': () => navigate('/analytics'),
    
    // Action shortcuts
    '?': () => showShortcutsHelp(),
    'Escape': () => closeModals(),
    'r': () => refreshPage(),
    'n': () => createNewTask(),
    'f': () => focusSearch(),
    
    // System shortcuts
    'ctrl+k': () => openCommandPalette(),
    'cmd+k': () => openCommandPalette(),
    'ctrl+/': () => showShortcutsHelp(),
    'cmd+/': () => showShortcutsHelp()
  };

  const showShortcutsHelp = useCallback(() => {
    const helpText = `
Keyboard Shortcuts:
Navigation:
  g + d: Dashboard
  g + m: Models  
  g + t: Tasks
  g + a: Agents
  g + s: System
  g + c: Configuration
  g + y: Analytics

Actions:
  n: New Task
  r: Refresh
  f: Focus Search
  ?: Show this help
  Esc: Close modals

System:
  Ctrl/Cmd + K: Command Palette
  Ctrl/Cmd + /: Show shortcuts
    `.trim();

    info(helpText, { 
      title: 'Keyboard Shortcuts', 
      duration: 10000 
    });
  }, [info]);

  const closeModals = useCallback(() => {
    // Close any open modals by dispatching escape events
    const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal]');
    modals.forEach(modal => {
      const closeButton = modal.querySelector('[data-close], .close, [aria-label*="close" i]');
      if (closeButton) {
        closeButton.click();
      }
    });

    // Clear focus from inputs
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      activeElement.blur();
    }
  }, []);

  const refreshPage = useCallback(() => {
    window.location.reload();
  }, []);

  const createNewTask = useCallback(() => {
    // Try to find and click the "New Task" button
    const newTaskButton = document.querySelector('[data-action="new-task"], button[title*="New Task" i], button:contains("New Task")');
    if (newTaskButton) {
      newTaskButton.click();
    } else {
      navigate('/tasks');
      info('Navigate to Tasks page to create a new task', { title: 'New Task' });
    }
  }, [navigate, info]);

  const focusSearch = useCallback(() => {
    // Find and focus the search input
    const searchInput = document.querySelector('input[placeholder*="search" i], input[type="search"], [data-search]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    } else {
      info('Search not available on current page', { title: 'Focus Search' });
    }
  }, [info]);

  const openCommandPalette = useCallback(() => {
    // Placeholder for command palette functionality
    info('Command palette coming soon!', { title: 'Command Palette' });
  }, [info]);

  // Key sequence tracking for multi-key shortcuts
  const [keySequence, setKeySequence] = React.useState([]);
  const [sequenceTimer, setSequenceTimer] = React.useState(null);

  const handleKeyDown = useCallback((event) => {
    // Ignore if user is typing in an input field
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.contentEditable === 'true') {
      return;
    }

    const key = event.key.toLowerCase();
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
    
    // Handle modifier combinations first
    if (hasModifier) {
      const modifierKey = event.ctrlKey ? 'ctrl' : event.metaKey ? 'cmd' : 'alt';
      const combination = `${modifierKey}+${key}`;
      
      if (shortcuts[combination]) {
        event.preventDefault();
        shortcuts[combination]();
        return;
      }
    }

    // Handle single keys and sequences
    if (!hasModifier) {
      // Clear previous sequence timer
      if (sequenceTimer) {
        clearTimeout(sequenceTimer);
      }

      // Add key to sequence
      const newSequence = [...keySequence, key];
      const sequenceString = newSequence.join(',');

      // Check for exact matches
      if (shortcuts[sequenceString]) {
        event.preventDefault();
        shortcuts[sequenceString]();
        setKeySequence([]);
        return;
      }

      // Check for single key shortcuts
      if (shortcuts[key] && keySequence.length === 0) {
        event.preventDefault();
        shortcuts[key]();
        return;
      }

      // Update sequence and set timer
      setKeySequence(newSequence);
      setSequenceTimer(setTimeout(() => {
        setKeySequence([]);
      }, 2000)); // Clear sequence after 2 seconds
    }
  }, [keySequence, sequenceTimer, shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimer) {
        clearTimeout(sequenceTimer);
      }
    };
  }, [handleKeyDown, sequenceTimer]);

  // Return current key sequence for UI display
  return {
    keySequence: keySequence.join(' + '),
    showShortcutsHelp,
    shortcuts: Object.keys(shortcuts)
  };
};

// Hook for component-specific shortcuts
export const useComponentShortcuts = (componentShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore if user is typing in an input field
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.contentEditable === 'true') {
        return;
      }

      const key = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      
      if (hasModifier) {
        const modifierKey = event.ctrlKey ? 'ctrl' : event.metaKey ? 'cmd' : 'alt';
        const combination = `${modifierKey}+${key}`;
        
        if (componentShortcuts[combination]) {
          event.preventDefault();
          componentShortcuts[combination]();
        }
      } else if (componentShortcuts[key]) {
        event.preventDefault();
        componentShortcuts[key]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [componentShortcuts]);
};

export default useKeyboardShortcuts;
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only handle shortcuts when not typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + key combinations
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            navigate('/');
            break;
          case '2':
            event.preventDefault();
            navigate('/models');
            break;
          case '3':
            event.preventDefault();
            navigate('/tasks');
            break;
          case '4':
            event.preventDefault();
            navigate('/agents');
            break;
          case '5':
            event.preventDefault();
            navigate('/analytics');
            break;
          case '6':
            event.preventDefault();
            navigate('/system');
            break;
          case '7':
            event.preventDefault();
            navigate('/config');
            break;
          default:
            break;
        }
      }

      // Single key shortcuts
      switch (event.key) {
        case 'Escape':
          // Close any open modals or panels
          break;
        case '?':
          // Show help modal
          event.preventDefault();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [navigate]);
};
