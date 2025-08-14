// Enhanced room join/create flows with proper error handling and UX
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/useToast';
import { useNavigation } from '../../hooks/useNavigation';
import { RoomManager } from '../../lib/roomManager';
import { ROUTES } from '../../constants/routes';
import type { CreateRoomPayload } from '../../types/room';

interface JoinRoomFlowProps {
  mode: 'join' | 'create';
  roomData?: CreateRoomPayload;
  roomIdOrCode?: string;
  onSuccess?: (roomId: string) => void;
  onError?: (error: string) => void;
}

export const JoinRoomFlow: React.FC<JoinRoomFlowProps> = ({
  mode,
  roomData,
  roomIdOrCode,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { toast } = useToast();
  const { navigateToRoom } = useNavigation();

  const handleCreateAndJoin = async () => {
    if (!roomData) {
      setStatus('error');
      setMessage('Room data is required for creation');
      return;
    }

    setLoading(true);
    setStatus('processing');
    setMessage('Creating room...');

    try {
      const result = await RoomManager.createAndJoinRoom(roomData);

      if (result.success && result.room) {
        setStatus('success');
        setMessage('Room created successfully!');
        
        toast({
          title: 'Room Created',
          description: `Welcome to ${result.room.name}!`
        });

        // Navigate to room
        setTimeout(() => {
          navigateToRoom(result.room!.id);
          onSuccess?.(result.room!.id);
        }, 1000);

      } else {
        throw new Error(result.error || 'Failed to create room');
      }

    } catch (error: any) {
      console.error('Create room error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to create room');
      
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create room',
        variant: 'destructive'
      });

      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinExisting = async () => {
    if (!roomIdOrCode) {
      setStatus('error');
      setMessage('Room ID or code is required');
      return;
    }

    setLoading(true);
    setStatus('processing');
    setMessage('Joining room...');

    try {
      const result = await RoomManager.joinRoom(roomIdOrCode);

      if (result.success && result.room) {
        if (result.code === 'ALREADY_MEMBER') {
          setStatus('success');
          setMessage('You\'re already a member of this room!');
          
          toast({
            title: 'Already Joined',
            description: `Welcome back to ${result.room.name}!`
          });
        } else {
          setStatus('success');
          setMessage('Successfully joined room!');
          
          toast({
            title: 'Joined Room',
            description: `Welcome to ${result.room.name}!`
          });
        }

        // Navigate to room
        setTimeout(() => {
          navigateToRoom(result.room!.id);
          onSuccess?.(result.room!.id);
        }, 1000);

      } else {
        // Handle different error codes with user-friendly messages
        let userMessage = result.error || 'Failed to join room';
        
        switch (result.code) {
          case 'ROOM_NOT_FOUND':
            userMessage = 'Room not found. Please check the room code and try again.';
            break;
          case 'MAX_CAPACITY':
            userMessage = 'This room is full. Try again later or contact the room admin.';
            break;
          case 'ROOM_PRIVATE':
            userMessage = 'This room is private. You need an invitation to join.';
            break;
        }

        setStatus('error');
        setMessage(userMessage);
        
        toast({
          title: 'Cannot Join Room',
          description: userMessage,
          variant: 'destructive'
        });

        onError?.(userMessage);
      }

    } catch (error: any) {
      console.error('Join room error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to join room');
      
      toast({
        title: 'Join Failed',
        description: error.message || 'Failed to join room',
        variant: 'destructive'
      });

      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (mode === 'create') {
      handleCreateAndJoin();
    } else {
      handleJoinExisting();
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-6 h-6 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Users className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Display */}
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border-2 ${getStatusColor()} flex items-center gap-3`}
        >
          {getStatusIcon()}
          <div>
            <p className="font-medium text-gray-800">
              {message}
            </p>
            {status === 'processing' && (
              <p className="text-sm text-gray-600 mt-1">
                Please wait, this may take a moment...
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Action Button */}
      <Button
        onClick={handleAction}
        disabled={loading || status === 'success'}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {mode === 'create' ? 'Creating...' : 'Joining...'}
          </>
        ) : (
          <>
            <Users className="w-4 h-4 mr-2" />
            {mode === 'create' ? 'Create & Enter Room' : 'Join Room'}
          </>
        )}
      </Button>
    </div>
  );
};