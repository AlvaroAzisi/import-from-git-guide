import React from 'react';
import { upgradeToPro } from '../../lib/payments';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

const PricingTable: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const handleUpgrade = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'Please log in to upgrade.', variant: 'destructive' });
      return;
    }

    const { success, error } = await upgradeToPro(user.id);
    if (success) {
      toast({ title: 'Success', description: 'Successfully upgraded to Pro!' });
      refreshProfile(); // Refresh user profile to update is_pro status
    } else {
      toast({ title: 'Error', description: error || 'Failed to upgrade.', variant: 'destructive' });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-bold mb-4">Free</h2>
        <p className="text-4xl font-bold">$0</p>
        <p className="text-gray-500">per month</p>
        <ul className="mt-4 text-left">
          <li>Basic Features</li>
          <li>Limited Rooms</li>
        </ul>
        <button className="mt-4 bg-gray-500 text-white font-bold py-2 px-4 rounded cursor-not-allowed">
          Current Plan
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-bold mb-4">Pro</h2>
        <p className="text-4xl font-bold">$10</p>
        <p className="text-gray-500">per month</p>
        <ul className="mt-4 text-left">
          <li>All Features</li>
          <li>Unlimited Rooms</li>
          <li>Analytics</li>
        </ul>
        <button
          onClick={handleUpgrade}
          className="mt-4 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
};

export default PricingTable;
