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
import { createOrUpdateProfile, UserProfile } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(true); // Tracks if operations are ongoing

  // Set a 20-second timeout to allow more time for slow operations
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isFetching.current) {
        setError('Loading timed out. Please try refreshing.');
        setLoading(false);
        console.error('[AuthContext] Loading timed out after 20 seconds.');
      }
    }, 20000); // Increased to 20 seconds
    return () => clearTimeout(timeout);
  }, []);

  // Handle initial session fetch and auth state changes
  useEffect(() => {
    const getInitialSession = async () => {
      // Prevent duplicate runs in Strict Mode by checking if already fetching
      if (!isFetching.current) return;
      isFetching.current = true;
      setLoading(true);
      setError(null);
      try {
        console.time('getSession');
        console.log('[Auth] Calling supabase.auth.getSession()');
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        console.timeEnd('getSession'); // Logs time taken

        if (error) {
          console.error('[AuthContext] getSession error:', error);
          throw error;
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        console.log('[Auth] getSession result user:', currentUser);

        if (currentUser) {
          try {
            console.time('createOrUpdateProfile');
            console.log(
              '[Auth] Calling createOrUpdateProfile for user:',
              currentUser.id
            );
            const userProfile = await createOrUpdateProfile(currentUser);
            console.timeEnd('createOrUpdateProfile'); // Logs time taken
            setProfile(userProfile);
            console.log('[Auth] setProfile after getSession:', userProfile);
          } catch (profileErr) {
            console.error(
              '[AuthContext] Error creating/updating profile:',
              profileErr
            );
            setProfile(null);
            setError('Failed to load profile: ' + (profileErr as Error).message);
          }
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
        console.log('[Auth] getInitialSession completed');
      }
    };

    getInitialSession();

    // Listen to auth state changes (e.g., SIGNED_IN)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event, session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setProfile(null); // Reset profile while fetching

        if (currentUser) {
          try {
            console.time('createOrUpdateProfile');
            console.log(
              '[Auth] Calling createOrUpdateProfile for user:',
              currentUser.id
            );
            const userProfile = await createOrUpdateProfile(currentUser);
            console.timeEnd('createOrUpdateProfile');
            setProfile(userProfile);
            console.log('[Auth] setProfile after onAuthStateChange:', userProfile);
            setError(null);
          } catch (err: any) {
            console.error('[AuthContext] Error updating profile:', err);
            setProfile(null);
            setError('Failed to update profile: ' + (err?.message || err));
          }
        } else {
          setError(null);
        }
        setLoading(false);
        console.log('[Auth] onAuthStateChange loading set to false');
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
      console.log('[Auth] Auth listener unsubscribed');
    };
  }, []);

  const value = { user, profile, loading, error };

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