import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  MessageCircle, 
  Users, 
  ChevronLeft,
  ChevronRight,
  Hash,
  AtSign
} from 'lucide-react';
import { getConversations, createGroupConversation } from '../../lib/chat';
import { searchUsers } from '../../lib/auth';
import { useToast } from '../../hooks/useToast';
import { CreateGroupModal } from './CreateGroupModal';
import { ConversationItem } from './ConversationItem';
import type { Conversation } from '../../lib/chat';
import type { UserProfile } from '../../lib/auth';

interface ChatSidebarProps {
  activeConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  minimized: boolean;
  onToggleMinimized: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  activeConversation,
  onConversationSelect,
  minimized,
  onToggleMinimized
}) => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await getConversations();
        setConversations(data);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();

    // Set up real-time subscription for conversation updates
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Search users for new DMs
  useEffect(() => {
    const searchUsersDebounced = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsersDebounced, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleCreateGroup = async (name: string, description?: string) => {
    try {
      const conversationId = await createGroupConversation(name, description);
      if (conversationId) {
        toast({
          title: 'Group created',
          description: `Created "${name}" successfully!`
        });
        
        // Reload conversations
        const data = await getConversations();
        setConversations(data);
        
        // Select the new group
        const newConversation = data.find(c => c.id === conversationId);
        if (newConversation) {
          onConversationSelect(newConversation);
        }
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive'
      });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    if (conv.type === 'dm' && conv.other_user) {
      return conv.other_user.full_name.toLowerCase().includes(query) ||
             conv.other_user.username.toLowerCase().includes(query);
    } else if (conv.type === 'group' && conv.name) {
      return conv.name.toLowerCase().includes(query);
    }
    return false;
  });

  return (
    <div className="h-full backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-r border-white/20 dark:border-gray-700/20 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/20 dark:border-gray-700/20">
        <div className="flex items-center justify-between mb-4">
          <AnimatePresence mode="wait">
            {!minimized && (
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="text-xl font-bold text-gray-800 dark:text-gray-200"
              >
                Messages
              </motion.h1>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-2">
            {!minimized && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateGroup(true)}
                className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-400 rounded-xl hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200"
                title="Create Group"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleMinimized}
              className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-xl transition-colors"
              title={minimized ? "Expand sidebar" : "Minimize sidebar"}
            >
              {minimized ? (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Search */}
        <AnimatePresence>
          {!minimized && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 rounded-xl placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {!minimized ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-2"
            >
              {/* Search Results */}
              {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 px-3 mb-2">
                    People
                  </h3>
                  <div className="space-y-1">
                    {searchResults.slice(0, 5).map((user) => (
                      <motion.button
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => navigate(`/chat/@${user.username}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/20 dark:hover:bg-gray-800/20 transition-all duration-200"
                      >
                        <img
                          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=3b82f6&color=fff`}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            @{user.username}
                          </p>
                        </div>
                        <AtSign className="w-4 h-4 text-blue-500" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversations */}
              <div className="space-y-1">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="p-3 rounded-2xl animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 dark:bg-gray-700/20 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-white/20 dark:bg-gray-700/20 rounded w-3/4 mb-1"></div>
                          <div className="h-3 bg-white/10 dark:bg-gray-700/10 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation, index) => (
                    <motion.div
                      key={conversation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <ConversationItem
                        conversation={conversation}
                        isActive={activeConversation?.id === conversation.id}
                        onClick={() => handleConversationSelect(conversation)}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* Minimized View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-2 space-y-2"
            >
              {conversations.slice(0, 8).map((conversation) => (
                <motion.button
                  key={conversation.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onConversationSelect(conversation)}
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    activeConversation?.id === conversation.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30'
                  }`}
                  title={conversation.type === 'dm' 
                    ? conversation.other_user?.full_name 
                    : conversation.name
                  }
                >
                  {conversation.type === 'dm' ? (
                    <img
                      src={conversation.other_user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.other_user?.full_name || 'User')}&background=3b82f6&color=fff`}
                      alt={conversation.other_user?.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <Hash className="w-5 h-5" />
                  )}
                  
                  {/* Unread Badge */}
                  {(conversation.unread_count || 0) > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-medium text-white"
                    >
                      {conversation.unread_count! > 9 ? '9+' : conversation.unread_count}
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSuccess={handleCreateGroup}
      />
    </div>
  );
};