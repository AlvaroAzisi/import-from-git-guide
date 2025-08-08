import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { getRoomByCode, joinRoom } from '../lib/rooms';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleJoinByCode = async () => {
    if (!code.trim()) {
      toast({
        title: "Please enter a room code",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // First, find the room by code
      const room = await getRoomByCode(code.trim().toUpperCase());
      
      if (!room) {
        toast({
          title: "Room not found",
          description: "Invalid room code. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      // Try to join the room
      const success = await joinRoom(room.id);
      
      if (success) {
        toast({
          title: "Joined room!",
          description: `Welcome to "${room.name}"`,
        });
        onClose();
        setCode('');
        navigate(`/room/${room.id}`);
      } else {
        toast({
          title: "Failed to join",
          description: "Could not join the room. It might be full or you're already a member.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Join room error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join room.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinByCode();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Join Room</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Enter a room code to join a study session
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Room Code
                    </label>
                    <div className="relative">
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter room code (e.g., ABC123)"
                        className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 text-center text-lg font-mono tracking-wider"
                        maxLength={8}
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <Button
                    onClick={handleJoinByCode}
                    disabled={loading || !code.trim()}
                    className="w-full bg-primary hover:bg-primary/90 h-12"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Join Room
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Room codes are case-insensitive and 6-8 characters long
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};