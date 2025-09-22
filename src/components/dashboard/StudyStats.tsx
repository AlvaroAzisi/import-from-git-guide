import React, { useState, useEffect, memo } from 'react';
import { getStudyStats } from '../../lib/dashboard';
import { useAuth } from '../../hooks/useAuth';

const StudyStats: React.FC = memo(() => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    hoursStudied: 0,
    sessions: 0,
    averageSessionDuration: '0 hours',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      setLoading(true);
      const fetchedStats = await getStudyStats(user.id);
      if (fetchedStats) {
        setStats(fetchedStats);
      }
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return <div>Loading study stats...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Study Stats</h2>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold">{stats.hoursStudied}</p>
          <p className="text-gray-500">Hours Studied</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{stats.sessions}</p>
          <p className="text-gray-500">Sessions</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{stats.averageSessionDuration}</p>
          <p className="text-gray-500">Average Session</p>
        </div>
      </div>
    </div>
  );
});

export default StudyStats;
