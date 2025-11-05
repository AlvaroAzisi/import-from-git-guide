// Safe navigation hook with loading states and error handling
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

export const useNavigation = () => {
  const navigate = useNavigate();
  const [navigating, setNavigating] = useState<string | null>(null);

  const safeNavigate = async (
    path: string,
    options?: {
      replace?: boolean;
      state?: any;
      beforeNavigate?: () => Promise<void>;
    }
  ) => {
    if (navigating) return; // Prevent multiple simultaneous navigations

    try {
      setNavigating(path);

      // Execute any pre-navigation logic
      if (options?.beforeNavigate) {
        await options.beforeNavigate();
      }

      // Navigate
      navigate(path, {
        replace: options?.replace,
        state: options?.state,
      });
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setNavigating(null);
    }
  };

  const navigateToRoom = (roomId: string, replace = false) => {
    safeNavigate(ROUTES.RUANGKU(roomId), { replace });
  };

  const navigateToHome = (replace = false) => {
    safeNavigate(ROUTES.HOME, { replace });
  };

  const navigateToWork = (replace = false) => {
    safeNavigate(ROUTES.WORK, { replace });
  };

  return {
    safeNavigate,
    navigateToRoom,
    navigateToHome,
    navigateToWork,
    navigating,
    isNavigating: (path?: string) => (path ? navigating === path : !!navigating),
  };
};
