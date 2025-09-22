import React, { useState, useEffect } from 'react';
import type { Conversation } from '../../lib/chat';
import { supabase } from '../../integrations/supabase/client';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ conversations, activeConversation, onConversationSelect }) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel('users', { configs: { presence: { key: 'user_id' } } });

    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();
      const currentOnlineUsers = Object.values(newState).flatMap((users: any) => users.map((user: any) => user.user_id));
      setOnlineUsers(currentOnlineUsers);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          channel.track({ user_id: user.id, username: user.email });
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="w-1/4 bg-gray-100 p-4">
      <h2 className="text-lg font-bold mb-4">Conversations</h2>
      <ul>
        {conversations.map(convo => (
          <li
            key={convo.id}
            className={`p-2 cursor-pointer rounded-md ${
              activeConversation?.id === convo.id ? 'bg-blue-200' : 'hover:bg-gray-200'
            }`}
            onClick={() => onConversationSelect(convo)}
          >
            <div className="flex items-center">
              {onlineUsers.includes(convo.id) ? (
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              ) : (
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              )}
              {convo.name}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
