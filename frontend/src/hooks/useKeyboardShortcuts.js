import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  const handleKeyPress = useCallback((event) => {
    // Only handle shortcuts when not typing in inputs
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.contentEditable === 'true') {
      return;
    }

    // Check for modifier keys (Ctrl/Cmd + key)
    const isModifierPressed = event.ctrlKey || event.metaKey;

    if (isModifierPressed) {
      switch (event.key.toLowerCase()) {
        case 'h':
          event.preventDefault();
          navigate('/');
          break;
        case 'm':
          event.preventDefault();
          navigate('/models');
          break;
        case 't':
          event.preventDefault();
          navigate('/tasks');
          break;
        case 'a':
          event.preventDefault();
          navigate('/agents');
          break;
        case 'n':
          event.preventDefault();
          navigate('/analytics');
          break;
        case 's':
          event.preventDefault();
          navigate('/system');
          break;
        case ',':
          event.preventDefault();
          navigate('/config');
          break;
        case 'k':
          event.preventDefault();
          // Open command palette (implement later)
          console.log('Command palette shortcut');
          break;
        case '/':
          event.preventDefault();
          // Focus search (implement later)
          console.log('Search shortcut');
          break;
        default:
          break;
      }
    }

    // Handle non-modifier shortcuts
    if (!isModifierPressed) {
      switch (event.key) {
        case '?':
          event.preventDefault();
          // Show keyboard shortcuts help
          console.log('Show shortcuts help');
          break;
        case 'Escape':
          // Close modals, clear selections, etc.
          document.dispatchEvent(new CustomEvent('closeModals'));
          break;
        default:
          break;
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (process.env.REACT_APP_ENABLE_KEYBOARD_SHORTCUTS === 'true') {
      document.addEventListener('keydown', handleKeyPress);
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [handleKeyPress]);

  return {
    shortcuts: {
      'Ctrl/Cmd + H': 'Go to Dashboard',
      'Ctrl/Cmd + M': 'Go to Models',
      'Ctrl/Cmd + T': 'Go to Tasks',
      'Ctrl/Cmd + A': 'Go to Agents',
      'Ctrl/Cmd + N': 'Go to Analytics',
      'Ctrl/Cmd + S': 'Go to System',
      'Ctrl/Cmd + ,': 'Go to Configuration',
      'Ctrl/Cmd + K': 'Open Command Palette',
      'Ctrl/Cmd + /': 'Focus Search',
      '?': 'Show Keyboard Shortcuts',
      'Escape': 'Close Modals'
    }
  };
};