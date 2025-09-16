import { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';
import {
  createOrUpdateProfile,
  getProfile,
  UserProfile,
  signOut as supabaseSignOut,
} from '../lib/auth';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = async (currentUser: User) => {
    try {
      console.time('createOrUpdateProfile');
      const userProfile = await createOrUpdateProfile(currentUser);
      console.timeEnd('createOrUpdateProfile');
      if (userProfile) {
        setProfile(userProfile.data);
        setError(null);
      } else {
        throw new Error('Failed to create/update profile');
      }
    } catch (err: any) {
      console.error('[AuthContext] Profile error:', err);
      setProfile(null);
      setError('Failed to load profile: ' + (err?.message || err));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const freshProfile = await getProfile(user.id);
        setProfile(freshProfile.data);
        setError(null);
      } catch (err: any) {
        console.error('[AuthContext] Error refreshing profile:', err);
        setError('Failed to refresh profile: ' + (err?.message || err));
      }
    }
  };

  const signOut = async () => {
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        console.log('[Auth] Initializing auth...');

        // Set timeout
        timeoutId = setTimeout(() => {
          console.error('[AuthContext] Auth initialization timed out');
          setError('Authentication timed out. Please refresh the page.');
          setLoading(false);
        }, 30000);

        // Get initial session
        console.time('getSession');
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        console.timeEnd('getSession');

        if (error) throw error;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser);
        }

        clearTimeout(timeoutId);
        setLoading(false);
        console.log('[Auth] Auth initialization complete');
      } catch (err: any) {
        console.error('[AuthContext] Init error:', err);
        setUser(null);
        setProfile(null);
        setError('Authentication failed: ' + (err?.message || err));
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Auth state changed:', event);

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser && event === 'SIGNED_IN') {
        // Only fetch profile on sign in, not on token refresh
        setTimeout(() => fetchProfile(currentUser), 0);
        // Redirect to /home after successful authentication
        if (['/', '/auth', '/login'].includes(location.pathname)) {
          navigate('/home', { replace: true });
        }
      } else if (!currentUser) {
        setProfile(null);
        // Redirect to landing page when logged out
        if (location.pathname !== '/' && !location.pathname.startsWith('/@')) {
          navigate('/', { replace: true });
        }
      }

      if (initialized.current) {
        setLoading(false);
      }
    });

    initAuth();

    return () => {
      subscription?.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const value = { user, profile, loading, error, refreshProfile, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
