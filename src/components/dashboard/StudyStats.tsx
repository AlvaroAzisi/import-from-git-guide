import React from 'react';

const StudyStats: React.FC = () => {
  const stats = {
    hoursStudied: 42,
    sessions: 15,
    averageSession: '2.8 hours',
  };

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
          <p className="text-2xl font-bold">{stats.averageSession}</p>
          <p className="text-gray-500">Average Session</p>
        </div>
      </div>
    </div>
  );
};

export default StudyStats;
