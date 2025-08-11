import React from 'react';
import { motion } from 'framer-motion';
import { Hash, AtSign } from 'lucide-react';
import type { Conversation } from '../../lib/chat';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getDisplayName = () => {
    if (conversation.type === 'dm' && conversation.other_user) {
      return conversation.other_user.full_name;
    }
    return conversation.name || 'Unnamed Group';
  };

  const getDisplayAvatar = () => {
    if (conversation.type === 'dm' && conversation.other_user) {
      return conversation.other_user.avatar_url || 
             `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.other_user.full_name)}&background=3b82f6&color=fff`;
    }
    return conversation.avatar_url || null;
  };

  const getLastMessagePreview = () => {
    if (!conversation.last_message) return 'No messages yet';
    
    const content = conversation.last_message.content;
    if (conversation.last_message.message_type === 'image') {
      return '📷 Image';
    } else if (conversation.last_message.message_type === 'file') {
      return '📎 File';
    }
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left ${
        isActive
          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-200/50 dark:border-blue-700/50'
          : 'hover:bg-white/20 dark:hover:bg-gray-800/20'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {conversation.type === 'dm' ? (
          <img
            src={getDisplayAvatar() || ''}
            alt={getDisplayName()}
            className="w-12 h-12 rounded-full object-cover border-2 border-white/20 dark:border-gray-700/20"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-white/20 dark:border-gray-700/20">
            <Hash className="w-6 h-6 text-white" />
          </div>
        )}
        
        {/* Online indicator for DMs */}
        {conversation.type === 'dm' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
            {getDisplayName()}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {formatTime(conversation.last_message_at)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {getLastMessagePreview()}
          </p>
          
          {/* Unread Badge */}
          {(conversation.unread_count || 0) > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-medium text-white ml-2"
            >
              {conversation.unread_count! > 9 ? '9+' : conversation.unread_count}
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
};