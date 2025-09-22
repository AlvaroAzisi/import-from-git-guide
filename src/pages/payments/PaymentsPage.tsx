import React from 'react';
import PricingTable from '../../components/payments/PricingTable';
import SubscriptionDetails from '../../components/payments/SubscriptionDetails';

const PaymentsPage: React.FC = () => {
  const isSubscribed = false; // Mock value

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Subscription</h1>
      {isSubscribed ? <SubscriptionDetails /> : <PricingTable />}
    </div>
  );
};

export default PaymentsPage;
