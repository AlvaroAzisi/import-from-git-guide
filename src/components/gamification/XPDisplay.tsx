import React, { useState, useEffect } from 'react';
import { getUserGamificationStats } from '../../lib/gamification';
import { useAuth } from '../../hooks/useAuth';

const XPDisplay: React.FC = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      setLoading(true);
      const stats = await getUserGamificationStats();
      if (stats) {
        setXp(stats.xp);
        setLevel(stats.level);
      }
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return <div>Loading XP...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">XP & Level</h2>
      <p>Total XP: {xp}</p>
      <p>Level: {level}</p>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(xp % 100)}%` }}></div>
      </div>
    </div>
  );
};

export default XPDisplay;
