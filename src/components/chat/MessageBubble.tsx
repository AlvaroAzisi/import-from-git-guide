import React from 'react';
import type { ChatMessage } from '../../lib/chat';
import { useAuth } from '../../hooks/useAuth';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { user } = useAuth();
  const isOwnMessage = user?.id === message.sender_id;

  return (
    <div className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex items-end max-w-xs rounded-lg p-3 ${isOwnMessage
          ? 'bg-blue-500 text-white rounded-br-none'
          : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        {!isOwnMessage && message.profiles?.avatar_url && (
          <img
            src={message.profiles.avatar_url}
            alt={message.profiles.username}
            className="w-8 h-8 rounded-full mr-2"
          />
        )}
        <div>
          {!isOwnMessage && message.profiles?.username && (
            <div className="font-bold text-sm mb-1">{message.profiles.username}</div>
          )}
          <p className="text-sm">{message.content}</p>
          <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-200' : 'text-gray-500'}`}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {isOwnMessage && user?.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata.username}
            className="w-8 h-8 rounded-full ml-2"
          />
        )}
      </div>
    </div>
  );
};
