import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createOrUpdateProfile } from '../lib/auth';
import { useToast } from '../hooks/useToast';
import { ROUTES, isPublicRoute } from '../constants/routes';

// TODO: Disabled – depends on old schema (room operations)
export const AuthRedirectHandler: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (loading || !user) return;

      if (!isPublicRoute(location.pathname) && !location.pathname.startsWith('/@')) {
        return;
      }

      try {
        if (!profile) {
          console.log('[AuthRedirectHandler] Profile not found, creating/updating...');
          
          const profileResult = await createOrUpdateProfile(user);
          
          if (!profileResult.data) {
            throw new Error(profileResult.error || 'Failed to create profile');
          }
          
          console.log('[AuthRedirectHandler] Profile created/updated successfully');
        }

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
      }
    };

    handleAuthRedirect();
  }, [user, profile, loading, navigate, location.pathname, toast]);

  return null;
};