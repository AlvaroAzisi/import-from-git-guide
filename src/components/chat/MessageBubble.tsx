import React from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import type { ChatMessage } from '../../lib/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar
}) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderContent = () => {
    if (message.message_type === 'image' && message.attachments?.length > 0) {
      const attachment = message.attachments[0];
      return (
        <div className="space-y-2">
          <img
            src={attachment.url}
            alt="Shared image"
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.url, '_blank')}
          />
          {message.content !== '📷 Image' && (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      );
    } else if (message.message_type === 'file' && message.attachments?.length > 0) {
      const attachment = message.attachments[0];
      return (
        <div className="space-y-2">
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-white/10 dark:bg-gray-800/10 rounded-lg hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {attachment.name?.split('.').pop()?.toUpperCase() || 'FILE'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.name}</p>
              <p className="text-xs opacity-70">
                {(attachment.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </a>
          {message.content !== `📎 ${attachment.name}` && (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      );
    }

    return <p className="text-sm leading-relaxed">{message.content}</p>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {/* Avatar (for others' messages) */}
      {!isOwn && showAvatar && (
        <img
          src={message.sender?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender?.full_name || 'User')}&background=3b82f6&color=fff`}
          alt={message.sender?.full_name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      )}
      
      {/* Spacer for grouped messages */}
      {!isOwn && !showAvatar && <div className="w-8" />}

      {/* Message Bubble */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`max-w-xs lg:max-w-md ${
          isOwn
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
            : 'backdrop-blur-sm bg-white/40 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200'
        } rounded-2xl p-3 shadow-lg`}
      >
        {/* Sender name (for group chats, others' messages) */}
        {!isOwn && showAvatar && message.sender && (
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            {message.sender.full_name}
          </p>
        )}

        {/* Message Content */}
        {renderContent()}

        {/* Timestamp and Read Status */}
        <div className={`flex items-center justify-between mt-2 ${
          isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          <span className="text-xs">
            {formatTime(message.created_at)}
          </span>
          
          {isOwn && (
            <div className="flex items-center">
              {message.is_read ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};