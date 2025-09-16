import React from 'react';

// TODO adapted for new Supabase backend - group messages functionality disabled
// This component used 'group_messages' table which doesn't exist in simplified schema
interface ChatGroupProps {
  groupId: string;
  name: string;
}

const ChatGroup: React.FC<ChatGroupProps> = ({ name }) => {
  return (
    <div className="h-full flex flex-col justify-center items-center border rounded-lg bg-white dark:bg-gray-900 p-4">
      <h2 className="text-xl font-semibold mb-4">#{name}</h2>
      <p className="text-gray-500 text-center">
        Group chat functionality is temporarily disabled during backend migration.
      </p>
    </div>
  );
};

export default ChatGroup;
