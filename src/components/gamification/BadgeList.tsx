import React, { useState, useEffect } from 'react';
import { getUserBadges } from '../../lib/gamification';
import { useAuth } from '../../hooks/useAuth';

const BadgeList: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) return;
      setLoading(true);
      const fetchedBadges = await getUserBadges(user.id);
      if (fetchedBadges) {
        setBadges(fetchedBadges);
      }
      setLoading(false);
    };
    fetchBadges();
  }, [user]);

  if (loading) {
    return <div>Loading badges...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map(userBadge => (
          <div key={userBadge.badge_id} className="text-center">
            <div className="text-4xl">ð</div>
            <p className="font-bold">{userBadge.badges.name}</p>
            <p className="text-sm text-gray-500">{userBadge.badges.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeList;
