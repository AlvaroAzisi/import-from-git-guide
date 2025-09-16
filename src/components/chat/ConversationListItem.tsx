import React from 'react';

interface ConversationListItemProps {
  id: string;
  title: string;
  active?: boolean;
  onClick: () => void;
}

const ConversationListItem: React.FC<ConversationListItemProps> = ({
  id,
  title,
  active,
  onClick,
}) => {
  return (
    <button
      key={id}
      onClick={onClick}
      className={`block px-3 py-2 rounded-md w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${active ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
    >
      {title}
    </button>
  );
};

export default ConversationListItem;
