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
    console.error('useSidebar hook called outside of SidebarProvider');
    console.error('Current context value:', context);
    console.error('SidebarContext:', SidebarContext);
    
    // Return a fallback object to prevent the app from crashing
    return {
      isOpen: false,
      isMinimized: false,
      openSidebar: () => console.warn('useSidebar: openSidebar called outside provider'),
      closeSidebar: () => console.warn('useSidebar: closeSidebar called outside provider'),
      toggleSidebar: () => console.warn('useSidebar: toggleSidebar called outside provider'),
      minimizeSidebar: () => console.warn('useSidebar: minimizeSidebar called outside provider'),
      expandSidebar: () => console.warn('useSidebar: expandSidebar called outside provider'),
      toggleMinimized: () => console.warn('useSidebar: toggleMinimized called outside provider'),
    };
  }
  return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('SidebarProvider rendering...');
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

  console.log('SidebarProvider value:', value);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};