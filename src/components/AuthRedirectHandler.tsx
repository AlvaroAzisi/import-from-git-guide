import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createOrUpdateProfile } from '../lib/auth';
import { useToast } from '../hooks/useToast';

/**
 * AuthRedirectHandler - Ensures profile exists after login and redirects to /home
 * 
 * Manual test steps:
 * 1. Sign in with email/Google OAuth
 * 2. Verify profile is created/updated before redirect
 * 3. On page reload when signed in, should redirect to /home
 * 4. If profile creation fails, should show toast and not redirect
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

      // Skip if no user
      if (!user) return;

      // Skip if already on a protected route
      const protectedRoutes = ['/home', '/profile', '/rooms', '/chat', '/temanku', '/settings'];
      if (protectedRoutes.some(route => location.pathname.startsWith(route))) {
        return;
      }

      // Skip if on public profile route
      if (location.pathname.startsWith('/@')) {
        return;
      }

      try {
        // Ensure profile exists - wait for the promise to complete
        if (!profile) {
          console.log('[AuthRedirectHandler] Profile not found, creating/updating...');
          
          // TODO: DB/RLS: Varo will ensure profiles table has proper INSERT/UPDATE policies
          // Expected: createOrUpdateProfile returns UserProfile object or throws error
          const profileResult = await createOrUpdateProfile(user);
          
          if (!profileResult.data) {
            throw new Error(profileResult.error || 'Failed to create profile');
          }
          
          console.log('[AuthRedirectHandler] Profile created/updated successfully');
        }

        // Only redirect after profile is confirmed to exist
        console.log('[AuthRedirectHandler] Redirecting to /home');
        navigate('/home', { replace: true });
        
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