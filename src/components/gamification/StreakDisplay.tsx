import React from 'react';

const StreakDisplay: React.FC = () => {
  const streak = 5;

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
