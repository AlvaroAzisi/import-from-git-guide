import React, { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';

interface Conversation {
  id: string;
  name: string;
  type?: string;
}

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

      <div className="max-w-[1600px] 2xl:max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 2xl:px-12 3xl:px-16 4xl:px-24 py-4 md:py-6 2xl:py-8">
        <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-8 h-[calc(100vh-8rem)]">
          <aside className="col-span-12 md:col-span-4 lg:col-span-3 2xl:col-span-3">
            <ChatSidebar
              activeConversation={
                activeChat
                  ? ({
                      id: activeChat.id,
                      name: activeChat.name,
                    } as Conversation)
                  : null
              }
              onConversationSelect={(chat: any) =>
                setActiveChat({
                  id: chat.id,
                  type: chat.type === 'dm' ? 'friend' : 'group',
                  name: chat.name || chat.other_user?.full_name || 'Unknown',
                })
              }
              minimized={false}
              onToggleMinimized={() => {}}
            />
          </aside>

          <main className="col-span-12 md:col-span-8 lg:col-span-9 2xl:col-span-9">
            {activeChat ? (
              <ChatWindow
                conversation={({
                  id: activeChat.id,
                  name: activeChat.name,
                } as Conversation)}
                onBack={() => setActiveChat(null)}
                onToggleInfo={() => {}}
              />
            ) : (
              <div className="h-full flex items-center justify-center backdrop-blur-md bg-background/30 rounded-2xl border border-border/20">
                <p className="text-sm md:text-base 2xl:text-lg text-muted-foreground">
                  Select a conversation to start messaging
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
