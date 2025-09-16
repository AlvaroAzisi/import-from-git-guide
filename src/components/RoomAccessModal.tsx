import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, X } from 'lucide-react';
import { Button } from './ui/button';

interface RoomAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => Promise<void>;
  room: {
    name: string;
    description?: string;
    max_members: number;
    subject?: string;
  };
  memberCount: number;
  loading?: boolean;
}

export const RoomAccessModal: React.FC<RoomAccessModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  room,
  memberCount,
  loading = false,
}) => {
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await onJoin();
      onClose();
    } catch (error) {
      console.error('Join error:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white/90 dark:bg-gray-900/90 
                       backdrop-blur-lg rounded-2xl border border-white/20 
                       shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 
                           transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="text-center">
                <div
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 
                               rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Users className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Join Study Room
                </h3>

                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  {room.name}
                </h4>

                {room.subject && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
                    {room.subject}
                  </p>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {room.description && (
                <div className="mb-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {room.description}
                  </p>
                </div>
              )}

              {/* Room Stats */}
              <div
                className="flex items-center justify-between p-3 
                             bg-gray-50/50 dark:bg-gray-800/50 rounded-xl mb-6"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Members</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {memberCount} / {room.max_members}
                </span>
              </div>

              {/* Join Benefits */}
              <div className="mb-6">
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  What you'll get:
                </h5>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Real-time chat with other members
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Study together and share knowledge
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Earn XP for participation
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} disabled={isJoining} className="flex-1">
                  Cancel
                </Button>

                <Button
                  onClick={handleJoin}
                  disabled={isJoining || loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 
                           hover:from-blue-600 hover:to-purple-700 text-white
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <div
                      className="w-4 h-4 border-2 border-white/30 border-t-white 
                                   rounded-full animate-spin"
                    />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join Room
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
