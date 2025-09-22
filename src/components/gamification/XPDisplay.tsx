import React from 'react';

const XPDisplay: React.FC = () => {
  const xp = 1250;
  const level = 12;

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
