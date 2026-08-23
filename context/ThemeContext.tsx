'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColor = 'green' | 'blue' | 'purple' | 'orange' | 'rose';

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  setMode: (mode: ThemeMode) => void;
  setColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [color, setColorState] = useState<ThemeColor>('green');

  useEffect(() => {
    // Load from localStorage
    const savedMode = localStorage.getItem('kh_mart_theme_mode') as ThemeMode;
    const savedColor = localStorage.getItem('kh_mart_theme_color') as ThemeColor;
    
    if (savedMode) setModeState(savedMode);
    if (savedColor) setColorState(savedColor);
  }, []);

  useEffect(() => {
    // Apply classes/data-attributes to the root html element
    const root = document.documentElement;
    
    // Apply mode
    if (mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    } else {
      root.removeAttribute('data-theme');
    }

    // Apply color
    root.setAttribute('data-color', color);

  }, [mode, color]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('kh_mart_theme_mode', newMode);
  };

  const setColor = (newColor: ThemeColor) => {
    setColorState(newColor);
    localStorage.setItem('kh_mart_theme_color', newColor);
  };

  return (
    <ThemeContext.Provider value={{ mode, color, setMode, setColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
