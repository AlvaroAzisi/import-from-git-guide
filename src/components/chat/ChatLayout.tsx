import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import ChatInfoPanel from './ChatInfoPanel';
import { getConversation, createDMConversation } from '../../lib/chat';
import { getProfileByUsername } from '../../lib/auth';
import type { Conversation } from '../../lib/chat';

export const ChatLayout: React.FC = () => {
  const { username, groupId } = useParams<{ username?: string; groupId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  // Load conversation based on URL params
  useEffect(() => {
    const loadConversation = async () => {
      if (!user) return;

      setLoading(true);
      try {
        if (username) {
          // DM conversation
          const otherUser = await getProfileByUsername(username);
          if (otherUser.data) {
            const conversationId = await createDMConversation(otherUser.data.id);
            if (conversationId) {
              const conversation = await getConversation(conversationId.toString());
              setActiveConversation(conversation.data);
            }
          }
        } else if (groupId) {
          // Group conversation
          const conversation = await getConversation(groupId);
          setActiveConversation(conversation.data);
        } else {
          // No conversation selected
          setActiveConversation(null);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [username, groupId, user]);

  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation);
    
    // Update URL
    if (conversation.type === 'dm' && conversation.other_user) {
      navigate(`/chat/@${conversation.other_user.username}`, { replace: true });
    } else if (conversation.type === 'group') {
      navigate(`/chat/group/${conversation.id}`, { replace: true });
    }
  };

  const handleBackToList = () => {
    setActiveConversation(null);
    navigate('/chat', { replace: true });
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex overflow-hidden">
      {/* Chat Sidebar */}
      <motion.div
        animate={{ 
          width: sidebarMinimized ? '72px' : '320px' 
        }}
        transition={{ 
          duration: 0.22,
          ease: [0.22, 0.9, 0.26, 1]
        }}
        className="flex-shrink-0 border-r border-white/20 dark:border-gray-700/20"
      >
        <ChatSidebar
          activeConversation={activeConversation}
          onConversationSelect={handleConversationSelect}
          minimized={sidebarMinimized}
          onToggleMinimized={() => setSidebarMinimized(!sidebarMinimized)}
        />
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex">
        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              onBack={handleBackToList}
              onToggleInfo={() => setShowInfoPanel(!showInfoPanel)}
              loading={loading}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="text-center max-w-md">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                >
                  <MessageCircle className="w-12 h-12 text-blue-500" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Welcome to Chat
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a conversation from the sidebar to start messaging
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Info Panel */}
        <AnimatePresence>
          {showInfoPanel && activeConversation && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '320px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ 
                duration: 0.22,
                ease: [0.22, 0.9, 0.26, 1]
              }}
              className="border-l border-white/20 dark:border-gray-700/20 overflow-hidden"
            >
              <ChatInfoPanel
                conversation={activeConversation}
                onClose={() => setShowInfoPanel(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};