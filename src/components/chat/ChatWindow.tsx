import React from 'react';

// TODO: Disabled – depends on old schema (conversations, messages with attachments)
interface ChatWindowProps {
  conversation?: any;
  onBack?: () => void;
  onToggleInfo?: () => void;
  loading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Chat Window Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Message functionality is being rebuilt.</p>
      </div>
    </div>
  );
};
