import React from 'react';
import { Button } from './ui/button';

// TODO adapted for new Supabase backend - room requests functionality disabled
interface RequestToJoinButtonProps {
  roomId: string;
  className?: string;
}

const RequestToJoinButton: React.FC<RequestToJoinButtonProps> = ({ className }) => {
  return (
    <Button disabled className={className}>
      Join Request (Disabled)
    </Button>
  );
};

export default RequestToJoinButton;
