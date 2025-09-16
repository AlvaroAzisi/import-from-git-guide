import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { joinRoomByCode } from '../../lib/supabase-rpc';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * JoinRoomModal - Centered modal for joining rooms by code
 *
 * Manual test steps:
 * 1. Open modal - should be centered and focus on input
 * 2. Press ESC or click backdrop - should close
 * 3. Enter valid code - should join room and navigate to /ruangku/:id
 * 4. Enter invalid code - should show error toast
 * 5. Duplicate join attempts should not create duplicate memberships
 */
export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Trap focus within modal
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a room code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: DB/RLS: Varo will paste SQL for join_room_by_code RPC
      // Expected params: { p_code: string }
      // Expected response: { room_id: string, room_title: string, success: boolean }
      const result = await joinRoomByCode(trimmedCode);

      if (result.success && result.room_id) {
        toast({
          title: 'Joined Successfully!',
          description: `Welcome to ${result.room_title || 'the room'}!`,
        });

        onClose();
        navigate(`/ruangku/${result.room_id}`);
      } else {
        throw new Error(result.error || 'Failed to join room');
      }
    } catch (error: any) {
      console.error('Join room error:', error);
      toast({
        title: 'Failed to Join',
        description: error.message || 'Invalid room code or room is full',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Join Study Room
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Enter the room code to join instantly
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Room Code
                  </label>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className="text-center text-lg font-mono tracking-wider backdrop-blur-sm bg-white/50 dark:bg-gray-800/50"
                    maxLength={10}
                    disabled={loading}
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ask your study buddy for the room code
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outline"
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Join Room
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
