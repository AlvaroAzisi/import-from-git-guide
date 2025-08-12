import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Save, Trash2, RotateCcw, Copy, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { 
  updateRoom, 
  regenerateRoomCode, 
  softDeleteRoom, 
  type RoomUpdateData 
} from '../../lib/supabase-rpc';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface Room {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  short_code?: string;
  creator_id: string;
  max_members: number;
  is_public: boolean;
}

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onRoomUpdate?: (room: Room) => void;
  onRoomDelete?: () => void;
  userRole?: 'admin' | 'member';
}

/**
 * RoomSettingsModal - Reusable centered modal for room/group settings
 * 
 * Manual test steps:
 * 1. Open as admin - should see all edit/delete options
 * 2. Open as member - should see limited options
 * 3. Edit room details - should call updateRoom RPC
 * 4. Regenerate code - should call regenerateRoomCode RPC
 * 5. Delete room - should show confirmation and call softDeleteRoom RPC
 * 6. ESC/backdrop should close modal
 */
export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  room,
  onRoomUpdate,
  onRoomDelete,
  userRole = 'member'
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: room.name,
    description: room.description || '',
    subject: room.subject || '',
  });

  // Check if user is admin
  const isAdmin = userRole === 'admin' || room.creator_id === user?.id;

  // Reset form when room changes
  useEffect(() => {
    setFormData({
      name: room.name,
      description: room.description || '',
      subject: room.subject || '',
    });
    setShowDeleteConfirm(false);
  }, [room]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      
      // TODO: DB/RLS: Varo will paste SQL for update_room RPC
      // Expected params: { room_id: string, updates: RoomUpdateData }
      // Expected response: { success: boolean, room: Room, error?: string }
      const result = await updateRoom(room.id, formData);
      
      if (result.success && result.room) {
        toast({
          title: "Room updated",
          description: "Room settings saved successfully.",
        });
        
        onRoomUpdate?.(result.room);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to update room');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update room.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!isAdmin) return;

    try {
      // TODO: DB/RLS: Varo will paste SQL for regenerate_room_code RPC
      // Expected params: { room_id: string }
      // Expected response: { success: boolean, new_code: string, error?: string }
      const result = await regenerateRoomCode(room.id);
      
      if (result.success && result.new_code) {
        toast({
          title: "Code regenerated",
          description: `New invite code: ${result.new_code}`,
        });
        
        // Update room with new code
        const updatedRoom = { ...room, short_code: result.new_code };
        onRoomUpdate?.(updatedRoom);
      } else {
        throw new Error(result.error || 'Failed to regenerate code');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate code.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;

    try {
      setDeleting(true);
      
      // TODO: DB/RLS: Varo will paste SQL for soft_delete_room RPC
      // Expected params: { room_id: string }
      // Expected response: { success: boolean, error?: string }
      const result = await softDeleteRoom(room.id);
      
      if (result.success) {
        toast({
          title: "Room deleted",
          description: "The room has been deleted.",
        });
        
        onRoomDelete?.();
        onClose();
        navigate('/home');
      } else {
        throw new Error(result.error || 'Failed to delete room');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete room.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (room.short_code) {
      navigator.clipboard.writeText(room.short_code);
      toast({
        title: "Code copied!",
        description: `Invite code: ${room.short_code}`,
      });
    }
  };

  const handleShareInvite = () => {
    const message = `Join my study room "${room.name}" on Kupintar! Use code: ${room.short_code}`;
    navigator.clipboard.writeText(message);
    toast({
      title: "Invite message copied!",
      description: "Share this message with your friends.",
    });
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
            className="relative w-full max-w-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/20">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Room Settings
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-xl transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Room Info Section */}
              {isAdmin && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Room Information</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Room Name
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter room name"
                        className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50"
                        disabled={!isAdmin}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject
                      </label>
                      <Input
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Enter subject"
                        className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50"
                        disabled={!isAdmin}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your room"
                        rows={3}
                        className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 resize-none"
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={loading || !isAdmin}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Invite Code Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Invite Code</h3>
                
                <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-white/20 dark:border-gray-700/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Code:</span>
                    <code className="text-lg font-mono font-bold text-primary">{room.short_code}</code>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyInviteCode}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
                    <Button
                      onClick={handleShareInvite}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                  
                  {isAdmin && (
                    <Button
                      onClick={handleRegenerateCode}
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Regenerate Code
                    </Button>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              {isAdmin && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
                  
                  {!showDeleteConfirm ? (
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      variant="outline"
                      className="w-full border-red-500/50 text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Room
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          This action cannot be undone. This will permanently delete the room and all messages.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowDeleteConfirm(false)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleDelete}
                          disabled={deleting}
                          size="sm"
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          {deleting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            'Delete Forever'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};