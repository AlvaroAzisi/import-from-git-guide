import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface ProFeatureProps {
  children: React.ReactNode;
}

const ProFeature: React.FC<ProFeatureProps> = ({ children }) => {
  const { profile } = useAuth();
  const isPro = profile?.is_pro; // Use the actual is_pro status from the user profile

  if (!isPro) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-bold mb-4">Pro Feature</h2>
        <p>This feature is available for Pro members only.</p>
        <button className="mt-4 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
          Upgrade to Pro
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProFeature;
