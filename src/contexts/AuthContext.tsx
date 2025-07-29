import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { createOrUpdateProfile, UserProfile } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Get initial session when app mounts
  useEffect(() => {
    console.log('[Auth] Fetching session...');
    const getInitialSession = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await createOrUpdateProfile(currentUser);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error fetching session:', err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen to login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event, session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setProfile(null); // Reset profile while fetching

        if (currentUser) {
          try {
            const userProfile = await createOrUpdateProfile(currentUser);
            setProfile(userProfile);
          } catch (err) {
            console.error('[AuthContext] Error updating profile:', err);
            setProfile(null);
          }
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
      console.log('[Auth] Auth listener unsubscribed');
    };
  }, []);

  const value = {
    user,
    profile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
