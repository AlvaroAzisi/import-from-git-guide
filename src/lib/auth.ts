import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';



/**
 * Generate a safe username that satisfies common DB check constraints.
 * Adjust the rules here if your `valid_username` constraint differs.
 * Current rules:
 * - lowercase
 * - allow letters, numbers, underscores and dots
 * - must start with a letter
 * - length between 3 and 32
 */
const makeSafeUsername = (input: string | undefined, fallback: string) => {
  const raw = (input || fallback || '').toString().toLowerCase();
  // Keep letters, numbers, underscores and dots
  let username = raw.replace(/[^a-z0-9_.]/g, '');
  // Ensure starts with a letter; if not, prefix with 'u'
  if (!/^[a-z]/.test(username)) {
    username = 'u' + username;
  }
  // Trim length
  if (username.length > 32) username = username.slice(0, 32);
  // Ensure minimum length
  if (username.length < 3) username = (username + 'user').slice(0, 3);
  return username;
};

// Use a temporary type until database is properly rebuilt
export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  xp: number;
  level: number;
  streak: number;
  rooms_joined: number;
  rooms_created: number;
  messages_sent: number;
  friends_count: number;
  is_online_visible: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  interests?: string[] | null;
  phone?: string | null;
  phone_verified: boolean;
  status: 'online' | 'offline' | 'away' | 'busy';
  is_verified: boolean;
  is_deleted: boolean;
  last_seen_at?: string | null;
  location?: string | null;
  website?: string | null;
  created_at: string;
  updated_at: string;
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    if (!supabase) throw new Error('Supabase client is not initialized');
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      console.error('[Auth] Get current user failed:', error);
      return null;
    }

    return user ?? null;
  } catch (error: any) {
    console.error('[Auth] Get current user failed:', error);
    return null;
  }
};

/**
 * Creates or updates a user profile in the database
 */
export const createOrUpdateProfile = async (user: User): Promise<{ data: UserProfile | null; error: string | null }> => {
  try {
    const existingProfile = await getProfile(user.id);

    if (existingProfile.data) {
      // Update existing profile
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          email: user.email || existingProfile.data.email,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return { data, error: null };
    } else {
      // Create new profile
      const username = makeSafeUsername(user.email?.split('@')[0] || undefined, `user_${user.id.slice(-6)}`);
      const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User';
      
      const profileData = {
        id: user.id,
        email: user.email || '',
        username,
        full_name: displayName,
        avatar_url: user.user_metadata?.avatar_url || null,
        bio: null,
        xp: 0,
        level: 1,
        streak: 0,
        rooms_joined: 0,
        rooms_created: 0,
        messages_sent: 0,
        friends_count: 0,
        is_online_visible: true,
        email_notifications: true,
        push_notifications: true,
        interests: null,
        phone: null,
        phone_verified: false,
        status: 'online' as const,
        is_verified: false,
        is_deleted: false,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Use upsert with onConflict to avoid race conditions and to be idempotent
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('[Auth] Create/update profile failed:', error);
        return { data: null, error: error.message || String(error) };
      }

      return { data, error: null };
    }
  } catch (error: any) {
    console.error('[Auth] Create/update profile failed:', error);
    return { data: null, error: error.message || String(error) };
  }
};

/**
 * Signs in with Google (redirect)
 */
export const signInWithGoogle = async (): Promise<{ data: unknown; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    const redirectTo = `${window.location.origin}/home`;
    console.log(`[Auth] Signing in with Google, redirect: ${redirectTo}`);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (error) {
      console.error('[Auth] Google sign-in failed:', error);
      return { data: null, error: error.message || String(error) };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('[Auth] Google sign-in error:', error);
    return { data: null, error: error.message || String(error) };
  }
};

/**
 * Gets a user profile by ID
 */
export const getProfile = async (userId: string): Promise<{ data: UserProfile | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('[Auth] Get profile failed:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Gets a user profile by username
 */
export const getProfileByUsername = async (username: string): Promise<{ data: UserProfile | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('[Auth] Get profile by username failed:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Updates a user profile
 */
export const updateProfile = async (
  userId: string, 
  updates: Partial<UserProfile>
): Promise<{ data: UserProfile | null; error: string | null }> => {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('[Auth] Update profile failed:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Searches for users by name or username
 */
export const searchUsers = async (query: string): Promise<{ data: UserProfile[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .eq('is_deleted', false)
      .limit(20);
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('[Auth] Search users failed:', error);
    return { data: [], error: error.message };
  }
};

/**
 * Increments user XP
 */
export const incrementUserXP = async (userId: string, xpAmount: number = 1): Promise<void> => {
  try {
    // Consider using an RPC (Postgres function) for atomic increments at scale
    const { data: profile, error: getErr } = await getProfile(userId);
    if (getErr) throw getErr;
    if (!profile) {
      console.warn('[Auth] incrementUserXP: profile not found for', userId);
      return;
    }

    const newXP = profile.xp + xpAmount;
    const { error } = await supabase
      .from('profiles')
      .update({ 
        xp: newXP,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) throw error;
  } catch (error: any) {
    console.error('[Auth] Increment user XP failed:', error);
  }
};

// Form validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

interface ValidationResult {
  isValid: boolean;
  errors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

export const validateSignUpForm = (email: string, password: string, confirmPassword?: string): ValidationResult => {
  const errors: { email?: string; password?: string; confirmPassword?: string } = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Invalid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (!validatePassword(password)) {
    errors.password = 'Password must be at least 6 characters long';
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
};
