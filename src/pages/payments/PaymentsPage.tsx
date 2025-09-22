import React, { useState, useEffect } from 'react';
import PricingTable from '../../components/payments/PricingTable';
import SubscriptionDetails from '../../components/payments/SubscriptionDetails';
import { getSubscriptionStatus } from '../../lib/payments';
import { useAuth } from '../../hooks/useAuth';

const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      setLoading(true);
      const fetchedSubscription = await getSubscriptionStatus(user.id);
      setSubscription(fetchedSubscription);
      setLoading(false);
    };
    fetchSubscription();
  }, [user]);

  if (loading) {
    return <div>Loading subscription details...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Subscription</h1>
      {subscription && subscription.status === 'active' ? (
        <SubscriptionDetails subscription={subscription} />
      ) : (
        <PricingTable />
      )}
    </div>
  );
};

export default PaymentsPage;
