import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [compactMode, setCompactMode] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState('normal');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('claude-flow-theme') || 'light';
    const savedCompactMode = localStorage.getItem('claude-flow-compact') === 'true';
    const savedAnimationSpeed = localStorage.getItem('claude-flow-animation') || 'normal';
    
    setTheme(savedTheme);
    setCompactMode(savedCompactMode);
    setAnimationSpeed(savedAnimationSpeed);
    
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(savedTheme);
    
    // Apply compact mode
    if (savedCompactMode) {
      document.documentElement.classList.add('compact');
    }
    
    // Apply animation speed
    document.documentElement.classList.remove('slow', 'normal', 'fast');
    document.documentElement.classList.add(savedAnimationSpeed);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('claude-flow-theme', newTheme);
    
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
  };

  const toggleCompactMode = () => {
    const newCompactMode = !compactMode;
    setCompactMode(newCompactMode);
    localStorage.setItem('claude-flow-compact', newCompactMode.toString());
    
    if (newCompactMode) {
      document.documentElement.classList.add('compact');
    } else {
      document.documentElement.classList.remove('compact');
    }
  };

  const setAnimationSpeedSetting = (speed) => {
    setAnimationSpeed(speed);
    localStorage.setItem('claude-flow-animation', speed);
    
    document.documentElement.classList.remove('slow', 'normal', 'fast');
    document.documentElement.classList.add(speed);
  };

  const value = {
    theme,
    compactMode,
    animationSpeed,
    toggleTheme,
    toggleCompactMode,
    setAnimationSpeed: setAnimationSpeedSetting,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('claude-flow-theme');
    if (saved) {
      return JSON.parse(saved);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('claude-flow-theme', JSON.stringify(isDark));
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const value = {
    isDark,
    toggleTheme,
    theme: isDark ? 'dark' : 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
