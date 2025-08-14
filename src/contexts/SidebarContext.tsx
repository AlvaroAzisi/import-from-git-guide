// Sidebar state management context
import React, { createContext, useContext, useState, useCallback } from 'react';

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
  const [isOpen, setIsOpen] = useState(true); // Start visible by default
  const [isMinimized, setIsMinimized] = useState(false);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const minimizeSidebar = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const expandSidebar = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev);
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

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};