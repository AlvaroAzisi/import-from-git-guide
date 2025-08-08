import React from 'react';
import { Plus } from 'lucide-react';
import { ChatList } from './ChatList';

export const ChatSidebar: React.FC = () => {
  return (
    <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6 h-[75vh] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Chats</h2>
        <button className="px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ChatList />
      </div>
    </div>
  );
};
