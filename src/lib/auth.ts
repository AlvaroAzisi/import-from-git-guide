// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * DB constraints:
 * - username: /^[A-Za-z0-9_]+$/  AND length 3..30
 * - level >= 1
 * - xp >= 0
 *
 * This helper makes a DB-safe username candidate (alphanumeric + underscore only),
 * length-limited to 3..30, and provides a uniqueness helper to avoid collisions.
 */
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_RE = /^[A-Za-z0-9_]+$/;

export const makeSafeUsername = (input: string | undefined, fallback = 'user') => {
  let username = (input || '').toString().toLowerCase().replace(/[^a-z0-9_]/g, '');

  // 1. Handle empty/invalid input
  if (!username) {
    return `${fallback}${Math.random().toString(36).slice(2, 6)}`;
  }

  // 3. Ensure regex compliance (no leading digits)
  username = username.replace(/^[0-9]+/, '');

  // 2. Pad to min length
  if (username.length < USERNAME_MIN) {
    username = `${username}${fallback}`.slice(0, USERNAME_MAX); // Pad and ensure not too long
    if (username.length < USERNAME_MIN) {
        // if still too short, just make it a valid user
        username = `user${Math.random().toString(36).slice(2, 5)}`;
    }
  }

  // Trim to max length
  if (username.length > USERNAME_MAX) {
    username = username.slice(0, USERNAME_MAX);
  }

  // Final check for empty string after trimming
  if (!username) {
      return `${fallback}${Math.random().toString(36).slice(2, 6)}`;
  }

  return username;
};

/**
 * Ensure username is unique (attempts a few candidates if collisions).
 * - base: initial username candidate
 * - userId: optional; if found owner is same user, it's OK
 */
const ensureUniqueUsername = async (
  base: string,
  userId?: string,
  attempts = 8
): Promise<string> => {
  let candidate = base;
  for (let i = 0; i < attempts; i++) {
    const { data: existing, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();

    if (error) {
      // if the read fails, throw — caller will catch and handle
      throw error;
    }

    // If no existing user with candidate OR it belongs to current userId -> OK
    if (!existing || (userId && existing.id === userId)) return candidate;

    // Collision: generate a new candidate by appending short suffix
    const suffix = Math.random().toString(36).slice(2, 6);
    // keep within max length
    const trimmedBase = base.slice(0, Math.max(0, USERNAME_MAX - (suffix.length + 1)));
    candidate = `${trimmedBase}_${suffix}`;
  }

  // last-resort uniqueization
  return `${base.slice(0, USERNAME_MAX - 5)}_${Date.now().toString().slice(-4)}`;
};

// Use a temporary type until database is properly rebuilt
// TODO adapted for new Supabase backend - updated interface to match schema
export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  xp: number | null;
  level: number | null;
  streak: number | null;
  rooms_joined: number | null;
  rooms_created: number | null;
  messages_sent: number | null;
  friends_count: number | null;
  is_online_visible: boolean | null;
  email_notifications: boolean | null;
  push_notifications: boolean | null;
  interests?: string[] | null;
  phone?: string | null;
  phone_verified: boolean | null;
  status: 'online' | 'offline' | 'away' | 'busy' | null;
  is_verified: boolean | null;
  is_deleted: boolean | null;
  last_seen_at?: string | null;
  location?: string | null;
  website?: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_pro?: boolean;
}

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    if (!supabase) throw new Error('Supabase client is not initialized');
    const {
      data: { user },
      error,
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
 * Upsert (create or update) profile robustly:
 * - ensures username meets DB constraints (3..30 + alnum/underscore)
 * - ensures uniqueness (tries multiple candidates)
 * - enforces level >= 1 and xp >= 0 defaults
 * - if existing profile has an invalid username, it will normalize + try to fix it
 */
export const createOrUpdateProfile = async (
  user: User
): Promise<{ data: UserProfile | null; error: string | null }> => {
  try {
    // 1) Try to find existing profile (safe read)
    const { data: existingProfile, error: getErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (getErr) {
      console.error('[Auth] createOrUpdateProfile: get existing profile error', getErr);
      return { data: null, error: getErr.message || String(getErr) };
    }

    // Helper to compute base username candidate from user metadata/email
    const emailBase = user.email?.split('@')[0] ?? '';
    const metadataName = user.user_metadata?.full_name ?? '';
    const fallbackBase = `user${user.id.slice(-6)}`;

    // If there is an existing profile, examine/repair username if invalid
    if (existingProfile) {
      let { username } = existingProfile as any;

      // If username is null/empty or invalid per DB constraints, create a safe & unique replacement
      if (
        !username ||
        !USERNAME_RE.test(username) ||
        username.length < USERNAME_MIN ||
        username.length > USERNAME_MAX
      ) {
        const baseCandidate = makeSafeUsername(
          emailBase || metadataName || fallbackBase,
          fallbackBase
        );
        try {
          const unique = await ensureUniqueUsername(baseCandidate, user.id);
          // update username + updated_at
          const { error: updErr } = await supabase
            .from('profiles')
            .update({ username: unique, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select()
            .maybeSingle();

          if (updErr) {
            console.error('[Auth] createOrUpdateProfile: failed to repair username', updErr);
            // but continue: we'll still return existing profile to avoid blocking flow
          } else {
            username = unique;
            existingProfile.username = unique;
          }
        } catch (err) {
          console.error('[Auth] createOrUpdateProfile: ensureUniqueUsername failed', err);
        }
      }

      // Update minimal fields (email / updated_at) and ensure constraints for xp/level
      const updates: Partial<UserProfile> = {
        email: user.email || existingProfile.email,
        updated_at: new Date().toISOString(),
        // defensive: ensure xp/level meet constraints if present
        xp: (existingProfile.xp ?? 0) < 0 ? 0 : (existingProfile.xp ?? 0),
        level: (existingProfile.level ?? 1) < 1 ? 1 : (existingProfile.level ?? 1),
      };

      const { data: finalProfile, error: finalErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .maybeSingle();

      if (finalErr) {
        console.error('[Auth] createOrUpdateProfile: update failed', finalErr);
        return { data: null, error: finalErr.message || String(finalErr) };
      }

      return { data: finalProfile as UserProfile, error: null };
    }

    // No existing profile -> create new profile. Build safe/unique username first.
    const baseCandidate = makeSafeUsername(emailBase || metadataName || fallbackBase, fallbackBase);
    const uniqueUsername = await ensureUniqueUsername(baseCandidate, user.id);

    const profileData = {
      id: user.id,
      email: user.email || '',
      username: uniqueUsername,
      full_name: user.user_metadata?.full_name || emailBase || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      bio: null,
      xp: 0, // ensure >= 0
      level: 1, // ensure >= 1
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
      updated_at: new Date().toISOString(),
    };

    // Try upsert once (idempotent). If unique-violation happens (rare due to ensureUniqueUsername race),
    // attempt a few retries with a new unique username.
    const maxRetries = 4;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (!error) {
        return { data, error: null };
      }

      // If it's a unique-violation on username or other transient uniqueness issue, retry with new username
      const msg = (error && (error.message || '')).toString().toLowerCase();
      if (
        msg.includes('duplicate') ||
        msg.includes('unique') ||
        msg.includes('23505') ||
        attempt < maxRetries
      ) {
        // generate a new safe candidate and retry
        const newBase = baseCandidate + Math.random().toString(36).slice(2, 5);
        profileData.username = await ensureUniqueUsername(newBase, user.id);
        // loop to retry
        continue;
      }

      // otherwise return the error as-is
      console.error('[Auth] Create/update profile failed (upsert):', error);
      return { data: null, error: error.message || String(error) };
    }

    // if we exhausted retries, signal back failure
    return { data: null, error: 'Failed to create profile after retries' };
  } catch (error: any) {
    console.error('[Auth] Create/update profile failed (catch):', error);
    return { data: null, error: error.message || String(error) };
  }
};

/**
 * Signs up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<{ data: { user: User } | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });

    if (error) {
      console.error('[Auth] Email sign-up failed:', error);
      return { data: null, error: error.message || String(error) };
    }

    // Supabase returns { user, session } in data
    if (data?.user) {
      return { data: { user: data.user }, error: null };
    }
    return { data: null, error: null };
  } catch (error: unknown) {
    console.error('[Auth] Email sign-up error:', error);
    return {
      data: null,
      error:
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: string }).message || String(error)
          : String(error),
    };
  }
};

/**
 * Signs in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ data: { user: User } | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Email sign-in failed:', error);
      return { data: null, error: error.message || String(error) };
    }

    if (data?.user) {
      return { data: { user: data.user }, error: null };
    }
    return { data: null, error: null };
  } catch (error: unknown) {
    console.error('[Auth] Email sign-in error:', error);
    return {
      data: null,
      error:
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: string }).message || String(error)
          : String(error),
    };
  }
};

/**
 * Signs in with Google (redirect)
 */
export const signInWithGoogle = async (): Promise<{ data: { user: User } | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    const redirectTo = `${window.location.origin}/home`;
    console.log(`[Auth] Signing in with Google, redirect: ${redirectTo}`);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      console.error('[Auth] Google sign-in failed:', error);
      return { data: null, error: error.message || String(error) };
    }

  // OAuth does not return user immediately, only provider and url
  return { data: null, error: null };
  } catch (error: unknown) {
    console.error('[Auth] Google sign-in error:', error);
    return {
      data: null,
      error:
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: string }).message || String(error)
          : String(error),
    };
  }
};

/**
 * Signs out the current user and redirects to home
 */
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    if (!supabase) throw new Error('Supabase client is not initialized');
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Sign out failed:', error);
      return { error: error.message || String(error) };
    }

    // Force redirect to landing page after successful sign out
    window.location.href = '/';
    return { error: null };
  } catch (error: any) {
    console.error('[Auth] Sign out error:', error);
    return { error: error.message || String(error) };
  }
};

/**
 * Gets a user profile by ID
 */
export const getProfile = async (
  userId: string
): Promise<{ data: UserProfile | null; error: string | null }> => {
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
export const getProfileByUsername = async (
  username: string
): Promise<{ data: UserProfile | null; error: string | null }> => {
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
      updated_at: new Date().toISOString(),
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
export const searchUsers = async (
  query: string
): Promise<{ data: UserProfile[]; error: string | null }> => {
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

    const newXP = (profile.xp || 0) + xpAmount;
    const { error } = await supabase
      .from('profiles')
      .update({
        xp: newXP,
        updated_at: new Date().toISOString(),
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

export const validateSignUpForm = (
  email: string,
  password: string,
  confirmPassword?: string
): ValidationResult => {
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
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
};
