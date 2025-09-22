import React, { useState, useEffect, memo } from 'react';
import { getAnalyticsData, AnalyticsData } from '../../lib/dashboard';
import { useAuth } from '../../hooks/useAuth';

const AnalyticsChart: React.FC = memo(() => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      setLoading(true);
      const fetchedData = await getAnalyticsData();
      if (fetchedData) {
        setAnalyticsData(fetchedData);
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, [user]);

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Study Analytics (Pro)</h2>
      <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        {analyticsData ? (
          <div>
            <p className="text-gray-800">Daily Study Time:</p>
            <ul>
              {analyticsData.dailyStudyTime.map((data) => (
                <li key={data.date}>{data.date}: {data.minutes} minutes</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-500">No analytics data available.</p>
        )}
      </div>
    </div>
  );
});

export default AnalyticsChart;
