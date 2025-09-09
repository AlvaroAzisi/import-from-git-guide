import React from 'react';

// TODO adapted for new Supabase backend - chat info functionality disabled
// This component used 'conversation_members' table which doesn't exist in simplified schema
const ChatInfoPanel: React.FC = () => {
  return (
    <div className="p-4 text-center text-gray-500">
      <p>Chat info panel is temporarily disabled during backend migration.</p>
    </div>
  );
};

export default ChatInfoPanel;