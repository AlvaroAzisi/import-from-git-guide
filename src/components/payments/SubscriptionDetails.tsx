import React from 'react';
import { cancelSubscription } from '../../lib/payments';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import type { Subscription } from '../../lib/payments';

interface SubscriptionDetailsProps {
  subscription: Subscription;
}

const SubscriptionDetails: React.FC<SubscriptionDetailsProps> = ({ subscription }) => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const handleCancel = async () => {
    if (!user) return;

    if (window.confirm('Are you sure you want to cancel your subscription?')) {
      const { success, error } = await cancelSubscription(user.id);
      if (success) {
        toast({ title: 'Success', description: 'Subscription cancelled.' });
        refreshProfile(); // Refresh user profile to update is_pro status
      } else {
        toast({ title: 'Error', description: error || 'Failed to cancel subscription.', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">My Subscription</h2>
      <p><span className="font-bold">Plan:</span> {subscription.plan}</p>
      <p><span className="font-bold">Status:</span> {subscription.status}</p>
      {subscription.next_billing_date && (
        <p><span className="font-bold">Next Billing Date:</span> {new Date(subscription.next_billing_date).toLocaleDateString()}</p>
      )}
      <button
        onClick={handleCancel}
        className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
      >
        Cancel Subscription
      </button>
    </div>
  );
};

export default SubscriptionDetails;
