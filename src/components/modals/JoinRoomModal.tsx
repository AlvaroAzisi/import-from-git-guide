import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useRoomOperations } from '../../lib/roomOperations';
import { useToast } from '../../hooks/useToast';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (roomId: string) => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { joinRoom } = useRoomOperations();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setLoading(true);
    try {
      const result = await joinRoom(roomCode.trim());
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Successfully joined the room!',
        });
        setRoomCode('');
        onSuccess?.(roomCode);
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to join room',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="room-code" className="block text-sm font-medium mb-2">
              Room Code
            </label>
            <Input
              id="room-code"
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !roomCode.trim()}>
              {loading ? 'Joining...' : 'Join Room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};