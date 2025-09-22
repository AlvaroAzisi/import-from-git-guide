import React, { useState, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { getConversations } from '../../lib/chat';
import type { Conversation } from '../../lib/chat';

export const ChatLayout: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      const { data, error } = await getConversations();
      if (error) {
        console.error('Error fetching conversations:', error);
      } else if (data) {
        setConversations(data);
        if (data.length > 0) {
          setActiveConversation(data[0]);
        }
      }
      setLoading(false);
    };

    fetchConversations();
  }, []);

  if (loading) {
    return <div>Loading chat...</div>;
  }

  return (
    <div className="h-screen flex">
      <ChatSidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onConversationSelect={setActiveConversation}
      />
      <ChatWindow conversation={activeConversation} />
    </div>
  );
};

export default ChatLayout;
