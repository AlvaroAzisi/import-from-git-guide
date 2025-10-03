import React, { useState, useEffect } from 'react';
import { getUserGamificationStats } from '../../lib/gamification';
import { useAuth } from '../../hooks/useAuth';

const StreakDisplay: React.FC = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      setLoading(true);
      const stats = await getUserGamificationStats();
      if (stats) {
        setStreak(stats.streak_count);
      }
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return <div>Loading streak...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">Daily Streak</h2>
      <div className="flex items-center">
        <span className="text-4xl font-bold mr-2">{streak}</span>
        <span className="text-lg">days in a row!</span>
      </div>
    </div>
  );
};

export default StreakDisplay;
