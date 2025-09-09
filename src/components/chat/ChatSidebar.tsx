import React from 'react';
import type { Conversation } from '../../lib/chat';

interface ChatSidebarProps {
  activeConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  minimized: boolean;
  onToggleMinimized: () => void;
}

// TODO adapted for new Supabase backend - chat functionality disabled
export const ChatSidebar: React.FC<ChatSidebarProps> = ({ minimized }) => {
  return (
    <div className="h-full bg-white/30 dark:bg-gray-900/30 backdrop-blur-md border-r border-white/20 dark:border-gray-700/20">
      <div className="p-4">
        <h2 className={`font-bold ${minimized ? 'text-center text-xs' : 'text-lg'}`}>
          {minimized ? 'Chat' : 'Conversations'}
        </h2>
        <p className={`text-gray-500 text-center mt-4 ${minimized ? 'text-xs' : 'text-sm'}`}>
          Chat temporarily disabled during backend migration
        </p>
      </div>
    </div>
  );
};