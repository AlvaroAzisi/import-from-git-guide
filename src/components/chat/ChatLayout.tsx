import React from 'react';

// TODO: Disabled – depends on old schema (conversations, group_messages)
export const ChatLayout: React.FC = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          Chat Feature Coming Soon
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Chat functionality is being rebuilt for the new backend architecture.
        </p>
      </div>
    </div>
  );
};