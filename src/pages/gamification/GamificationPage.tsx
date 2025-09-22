import React from 'react';
import XPDisplay from '../../components/gamification/XPDisplay';
import StreakDisplay from '../../components/gamification/StreakDisplay';
import BadgeList from '../../components/gamification/BadgeList';

const GamificationPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gamification</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <XPDisplay />
        <StreakDisplay />
      </div>
      <div className="mt-4">
        <BadgeList />
      </div>
    </div>
  );
};

export default GamificationPage;
