import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * EntryRedirect - Root route handler
 * Checks Supabase session and redirects authenticated users to /home
 * or unauthenticated users to /auth/login
 */
export const EntryRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/home', { replace: true });
      } else {
        navigate('/auth/login', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // Loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted flex items-center justify-center">
      <div className="backdrop-blur-md bg-card/50 rounded-3xl border border-border/20 shadow-lg p-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-muted-foreground mt-4 text-sm">Loading Kupintar...</p>
      </div>
    </div>
  );
};
