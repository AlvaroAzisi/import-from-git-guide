// Feature disabled - subscriptions table exists but payment features not implemented
export interface Subscription {
  id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string | null;
  next_billing_date: string | null;
}

export const getUserSubscription = async (): Promise<Subscription | null> => {
  // Feature disabled
  return null;
};

export const upgradeSubscription = async (): Promise<boolean> => {
  // Feature disabled
  return false;
};

export const cancelSubscription = async (): Promise<boolean> => {
  // Feature disabled
  return false;
};