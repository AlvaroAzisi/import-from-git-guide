import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createOrUpdateProfile } from '../lib/auth';
import { useToast } from '../hooks/useToast';
import { getPendingJoin, clearPendingJoin, getPendingCreate, clearPendingCreate } from '../lib/roomOperations';
import { ROUTES, isPublicRoute } from '../constants/routes';

/**
 * AuthRedirectHandler - Ensures profile exists after login and redirects to /home
 * 
 * Manual test steps:
 * 1. Sign in with email/Google OAuth
 * 2. Verify profile is created/updated before redirect
 * 3. On page reload when signed in, should redirect to /home
 * 4. If profile creation fails, should show toast and not redirect
 * 5. Complete pending room operations after authentication
 */
export const AuthRedirectHandler: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Skip if still loading auth state
      if (loading) return;

      // Handle pending operations after authentication
      if (user && profile) {
        // Check for pending room join
        const pendingJoin = getPendingJoin();
        if (pendingJoin) {
          clearPendingJoin();
          console.log('[AuthRedirectHandler] Completing pending room join:', pendingJoin);
          navigate(ROUTES.ROOM(pendingJoin), { replace: true });
          return;
        }

        // Check for pending room creation
        const pendingCreate = getPendingCreate();
        if (pendingCreate) {
          clearPendingCreate();
          console.log('[AuthRedirectHandler] Pending room creation detected, staying on current page');
          // Don't redirect - let the user complete the creation flow
          return;
        }
      }

      // Skip if no user
      if (!user) return;

      // Skip if already on a protected route (but not public profile)
      if (!isPublicRoute(location.pathname) && !location.pathname.startsWith('/@')) {
        return;
      }

      try {
        // Ensure profile exists - wait for the promise to complete
        if (!profile) {
          console.log('[AuthRedirectHandler] Profile not found, creating/updating...');
          
          const profileResult = await createOrUpdateProfile(user);
          
          if (!profileResult.data) {
            throw new Error(profileResult.error || 'Failed to create profile');
          }
          
          console.log('[AuthRedirectHandler] Profile created/updated successfully');
        }

        // Only redirect after profile is confirmed to exist
        // Only redirect from root paths
        const rootPaths = ['/', '/login'];
        if (rootPaths.includes(location.pathname)) {
          console.log('[AuthRedirectHandler] Redirecting to /home');
          navigate(ROUTES.HOME, { replace: true });
        }
        
      } catch (error: any) {
        console.error('[AuthRedirectHandler] Profile creation failed:', error);
        toast({
          title: 'Profile Setup Failed',
          description: error.message || 'Unable to set up your profile. Please try again.',
          variant: 'destructive'
        });
        // Do not redirect on failure
      }
    };

    handleAuthRedirect();
  }, [user, profile, loading, navigate, location.pathname, toast]);

  // This component doesn't render anything
  return null;
};