import { supabase } from '../integrations/supabase/client';
import type { UserProfile } from './auth';

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  start_date: string;
  end_date: string | null;
  next_billing_date: string | null;
}

export const getSubscriptionStatus = async (userId: string): Promise<Subscription | null> => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      throw error;
    }
    return data as Subscription;
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return null;
  }
};

export const upgradeToPro = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Mock logic for upgrading to Pro
    // In a real scenario, this would involve calling a backend function
    // that integrates with Paddle/LemonSqueezy.
    console.log(`User ${userId} attempting to upgrade to Pro.`);
    // Simulate success
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: 'Pro',
        status: 'active',
        start_date: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      }, { onConflict: 'user_id' });

    if (error) throw error;

    // Update user profile to reflect pro status
    await supabase.from('profiles').update({ is_pro: true }).eq('id', userId);

    return { success: true };
  } catch (error: any) {
    console.error('Error upgrading to Pro:', error);
    return { success: false, error: error.message };
  }
};

export const cancelSubscription = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Mock logic for canceling subscription
    // In a real scenario, this would involve calling a backend function
    // that integrates with Paddle/LemonSqueezy.
    console.log(`User ${userId} attempting to cancel subscription.`);
    // Simulate success
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', end_date: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

    // Update user profile to reflect non-pro status
    await supabase.from('profiles').update({ is_pro: false }).eq('id', userId);

    return { success: true };
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return { success: false, error: error.message };
  }
};
