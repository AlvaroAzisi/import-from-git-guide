import React, { useState } from 'react';
import { UserMinus, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { supabase } from '../integrations/supabase/client';

interface LeaveRoomButtonProps {
  roomId: string;
  roomName?: string;
  variant?: 'default' | 'minimal' | 'danger';
  onLeave?: () => void;
  className?: string;
}

// TODO adapted for new Supabase backend
export const LeaveRoomButton: React.FC<LeaveRoomButtonProps> = ({
  roomId,
  roomName,
  variant = 'default',
  onLeave,
  className = ''
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLeaveRoom = async () => {
    if (!roomId || loading) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Left room successfully',
        description: `You have left ${roomName || 'the room'}.`
      });

      if (onLeave) {
        onLeave();
      } else {
        navigate('/home', { replace: true });
      }
    } catch (error: any) {
      console.error('Leave room error:', error);
      toast({
        title: 'Error leaving room',
        description: error.message || 'Failed to leave room. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = "inline-flex items-center gap-2 transition-all duration-200";
    
    switch (variant) {
      case 'minimal':
        return `${baseStyles} px-3 py-2 text-sm text-red-600 dark:text-red-400 
                hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ${className}`;
      case 'danger':
        return `${baseStyles} px-4 py-2 bg-red-500 hover:bg-red-600 text-white 
                rounded-xl font-medium shadow-lg hover:shadow-xl ${className}`;
      default:
        return `${baseStyles} px-4 py-2 bg-red-500/20 dark:bg-red-500/10 text-red-600 
                dark:text-red-400 rounded-xl hover:bg-red-500/30 dark:hover:bg-red-500/20 
                border border-red-200 dark:border-red-800 ${className}`;
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={getButtonStyles()}
      >
        <UserMinus className="w-4 h-4" />
        {variant === 'minimal' ? 'Leave' : 'Leave Room'}
      </button>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowConfirm(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white/90 dark:bg-gray-900/90 
                         backdrop-blur-lg rounded-2xl border border-white/20 
                         shadow-2xl p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full 
                               flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Leave Room?
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to leave 
                  {roomName ? (
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {' '}{roomName}
                    </span>
                  ) : (
                    ' this room'
                  )}? You'll need to be re-invited or find the room again to rejoin.
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={handleLeaveRoom}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 
                             hover:from-red-600 hover:to-red-700 text-white
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white 
                                     rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Leave Room
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};