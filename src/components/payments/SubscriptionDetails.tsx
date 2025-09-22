import React from 'react';

const SubscriptionDetails: React.FC = () => {
  const subscription = {
    plan: 'Pro',
    status: 'Active',
    nextBilling: '2025-10-22',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">My Subscription</h2>
      <p><span className="font-bold">Plan:</span> {subscription.plan}</p>
      <p><span className="font-bold">Status:</span> {subscription.status}</p>
      <p><span className="font-bold">Next Billing Date:</span> {subscription.nextBilling}</p>
      <button className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
        Cancel Subscription
      </button>
    </div>
  );
};

export default SubscriptionDetails;
