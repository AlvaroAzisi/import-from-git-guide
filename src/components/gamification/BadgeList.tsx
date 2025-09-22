import React from 'react';

const BadgeList: React.FC = () => {
  const badges = [
    { id: '1', name: 'First Steps', description: 'Joined Kupintar' },
    { id: '2', name: 'Social Butterfly', description: 'Made 10 friends' },
    { id: '3', name: 'Room Starter', description: 'Created a study room' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map(badge => (
          <div key={badge.id} className="text-center">
            <div className="text-4xl">ð</div>
            <p className="font-bold">{badge.name}</p>
            <p className="text-sm text-gray-500">{badge.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeList;
