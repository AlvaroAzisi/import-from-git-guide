import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { JoinRoomModal } from './JoinRoomModal';
import { Button } from './ui/button';

export const JoinRoomButton: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary/90">
        <UserPlus className="w-4 h-4 mr-2" />
        Join Room
      </Button>

      <JoinRoomModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
