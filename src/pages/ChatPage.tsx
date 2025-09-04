import React, { useEffect } from 'react';
import { ChatLayout } from '../components/chat/ChatLayout';

const ChatPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Chat | Kupintar';
  }, []);

  return <ChatLayout />;
};

export default ChatPage;
