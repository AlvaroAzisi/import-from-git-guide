import React, { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';

export type ActiveChat = {
  id: string;
  type: 'friend' | 'group';
  name: string;
};

const ChatLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);

  useEffect(() => {
    document.title = 'Chat | Kupintar';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <TopBar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onCreateRoom={() => {}} />

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3">
          <ChatSidebar activeChat={activeChat} onSelectChat={(chat) => setActiveChat(chat)} />
        </aside>

        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          {activeChat ? (
            <ChatWindow chatId={activeChat.id} type={activeChat.type} name={activeChat.name} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select a conversation to start messaging
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ChatLayout;
