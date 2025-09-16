import React from 'react';

// TODO: Disabled – depends on old schema (messages with attachments, sender)
interface MessageBubbleProps {
  message?: any;
  isOwn?: boolean;
  showAvatar?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = () => {
  return (
    <div className="p-2 text-center text-gray-500">
      <p className="text-sm">Message bubbles disabled</p>
    </div>
  );
};
