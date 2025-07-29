import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useRef,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
  const isFetching = useRef(true);

  const fetchAndSetProfile = async (currentUser: User | null) => {
    if (!currentUser) return;
    try {
      console.time('createOrUpdateProfile');
      const userProfile = await createOrUpdateProfile(currentUser);
      console.timeEnd('createOrUpdateProfile');
      setProfile(userProfile);
      setError(null);
    } catch (err: any) {
      console.error('[AuthContext] Error fetching profile:', err);
      setProfile(null);
      setError('Failed to fetch profile: ' + (err?.message || err));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const freshProfile = await getProfile(user.id);
        setProfile(freshProfile);
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
    const timeout = setTimeout(() => {
      if (isFetching.current) {
        setError('Loading timed out. Please try refreshing.');
        setLoading(false);
        console.error('[AuthContext] Loading timed out after 20 seconds.');
      }
    }, 20000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const getInitialSession = async () => {
      if (!isFetching.current) return;
      isFetching.current = true;
      setLoading(true);
      setError(null);

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchAndSetProfile(currentUser);
        } else {
          setProfile(null);
        }
      } catch (err: any) {
        console.error('[AuthContext] Error fetching session:', err);
        setUser(null);
        setProfile(null);
        setError('Failed to fetch session: ' + (err?.message || err));
      } finally {
        isFetching.current = false;
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setProfile(null);

        if (currentUser) {
          await fetchAndSetProfile(currentUser);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
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
