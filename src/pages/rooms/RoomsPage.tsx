import React from 'react';
import RoomList from '../../components/rooms/RoomList';
import CreateRoomForm from '../../components/rooms/CreateRoomForm';

const RoomsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Study Rooms</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <RoomList />
        </div>
        <div>
          <CreateRoomForm />
        </div>
      </div>
    </div>
  );
};

export default RoomsPage;
