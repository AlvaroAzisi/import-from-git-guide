// Enhanced sidebar state management with auto-minimize and smooth animations
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isMinimized: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  minimizeSidebar: () => void;
  expandSidebar: () => void;
  toggleMinimized: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start visible by default, but respect stored preference
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const stored = localStorage.getItem('kupintar_sidebar_open');
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      const stored = localStorage.getItem('kupintar_sidebar_minimized');
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem('kupintar_sidebar_open', JSON.stringify(isOpen));
    } catch (error) {
      console.warn('Failed to save sidebar open state:', error);
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('kupintar_sidebar_minimized', JSON.stringify(isMinimized));
    } catch (error) {
      console.warn('Failed to save sidebar minimized state:', error);
    }
  }, [isMinimized]);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev: boolean) => !prev);
  }, []);

  const minimizeSidebar = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const expandSidebar = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const toggleMinimized = useCallback(() => {
    setIsMinimized((prev: boolean) => !prev);
  }, []);

  const value = {
    isOpen,
    isMinimized,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    minimizeSidebar,
    expandSidebar,
    toggleMinimized,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};
