import React from 'react';

const AnalyticsChart: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Study Analytics (Pro)</h2>
      <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Chart will be displayed here.</p>
      </div>
    </div>
  );
};

export default AnalyticsChart;
