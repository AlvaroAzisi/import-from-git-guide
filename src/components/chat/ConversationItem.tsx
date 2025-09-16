import React from 'react';

// TODO: Disabled – depends on old schema (conversations)
interface ConversationItemProps {
  conversation?: any;
  isActive?: boolean;
  onClick?: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = () => {
  return (
    <div className="p-3 text-center text-gray-500">
      <p className="text-sm">Conversation items disabled</p>
    </div>
  );
};
