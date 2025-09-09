import React from 'react';

// TODO adapted for new Supabase backend - room requests functionality disabled 
// This component used 'room_requests' table which doesn't exist in simplified schema
const AdminRoomRequestsPanel: React.FC = () => {
  return (
    <div className="p-4 text-center text-gray-500">
      <p>Room requests feature is temporarily disabled during backend migration.</p>
    </div>
  );
};

export default AdminRoomRequestsPanel;