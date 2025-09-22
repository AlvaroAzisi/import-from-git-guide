import React from 'react';
import AnalyticsChart from '../../components/dashboard/AnalyticsChart';
import StudyStats from '../../components/dashboard/StudyStats';
import ProFeature from '../../components/dashboard/ProFeature';

const DashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StudyStats />
        <ProFeature>
          <AnalyticsChart />
        </ProFeature>
      </div>
    </div>
  );
};

export default DashboardPage;
