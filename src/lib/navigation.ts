// Safe navigation utilities with loading states and error handling
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { ROUTES } from '../constants/routes';

export const useNavigation = () => {
  const navigate = useNavigate();
  const [navigating, setNavigating] = useState<string | null>(null);
  const [clickedItem, setClickedItem] = useState<string | null>(null);

  const safeNavigate = useCallback(async (
    path: string, 
    options?: { 
      replace?: boolean;
      state?: any;
      beforeNavigate?: () => Promise<void>;
    }
  ) => {
    if (navigating === path) return; // Prevent duplicate navigation

    try {
      setNavigating(path);
      setClickedItem(path);

      // Execute any pre-navigation logic
      if (options?.beforeNavigate) {
        await options.beforeNavigate();
      }

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate
      navigate(path, {
        replace: options?.replace,
        state: options?.state
      });

    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setNavigating(null);
      // Keep clicked state briefly for visual feedback
      setTimeout(() => setClickedItem(null), 300);
    }
  }, [navigate, navigating]);

  const navigateToRoom = useCallback((roomId: string, replace = false) => {
    safeNavigate(ROUTES.ROOM(roomId), { replace });
  }, [safeNavigate]);

  const navigateToRuangku = useCallback((roomId: string, replace = false) => {
    safeNavigate(ROUTES.RUANGKU(roomId), { replace });
  }, [safeNavigate]);

  const navigateToHome = useCallback((replace = false) => {
    safeNavigate(ROUTES.HOME, { replace });
  }, [safeNavigate]);

  const navigateToWork = useCallback((replace = false) => {
    safeNavigate(ROUTES.WORK, { replace });
  }, [safeNavigate]);

  return {
    safeNavigate,
    navigateToRoom,
    navigateToRuangku,
    navigateToHome,
    navigateToWork,
    navigating,
    clickedItem,
    isNavigating: (path?: string) => path ? navigating === path : !!navigating,
    isClicked: (path?: string) => path ? clickedItem === path : !!clickedItem
  };
};

// Debounced click handler to prevent rapid navigation
export const useDebouncedNavigation = (delay = 300) => {
  const { safeNavigate, navigating } = useNavigation();
  const [lastClick, setLastClick] = useState<number>(0);

  const debouncedNavigate = useCallback((path: string, options?: any) => {
    const now = Date.now();
    if (now - lastClick < delay || navigating) return;
    
    setLastClick(now);
    safeNavigate(path, options);
  }, [safeNavigate, navigating, lastClick, delay]);

  return { debouncedNavigate, navigating };
};