import React from 'react';
import { useParams } from 'react-router-dom';
import RoomDetails from '../../components/rooms/RoomDetails';
import MemberList from '../../components/rooms/MemberList';

const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto p-4">
      <RoomDetails roomId={id!} />
      <div className="mt-4">
        <MemberList roomId={id!} />
      </div>
    </div>
  );
};

export default RoomDetailPage;
