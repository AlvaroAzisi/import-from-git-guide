import { useState } from 'react';
import { Settings, Save, Trash2, RotateCcw, Copy, Share2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import type { Room } from '../lib/rooms';
import { FloatingPanel } from './ui/floating-panel';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface RoomSettingsPanelProps {
  room: Room;
  isCreator: boolean;
  onRoomUpdate: (room: Room) => void;
  onRoomDelete: () => void;
}

export const RoomSettingsPanel: React.FC<RoomSettingsPanelProps> = ({
  room,
  isCreator,
  onRoomUpdate,
  onRoomDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: room.name,
    description: room.description || '',
    subject: room.subject || '',
  });

  if (!isCreator) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .update({
          name: formData.name,
          description: formData.description,
          subject: formData.subject,
          updated_at: new Date().toISOString(),
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;

      onRoomUpdate(data);
      toast({
        title: "Room updated",
        description: "Room settings saved successfully.",
      });
      setIsOpen(false);
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

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id);

      if (error) throw error;

      toast({
        title: "Room deleted",
        description: "The room has been permanently deleted.",
      });
      onRoomDelete();
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

  const handleRegenerateCode = async () => {
    try {
      // Call backend function to regenerate short code
      const { data, error } = await supabase.rpc('generate_short_code');
      
      if (error) throw error;

      const { data: updatedRoom, error: updateError } = await supabase
        .from('rooms')
        .update({ short_code: data, updated_at: new Date().toISOString() })
        .eq('id', room.id)
        .select()
        .single();

      if (updateError) throw updateError;

      onRoomUpdate(updatedRoom);
      toast({
        title: "Code regenerated",
        description: `New invite code: ${data}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate code.",
        variant: "destructive",
      });
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

  return (
    <>
      {/* Settings Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-xl transition-colors group"
        title="Room Settings"
      >
        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors" />
      </button>

      {/* Settings Panel */}
      <FloatingPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Room Settings"
        size="lg"
        position="right"
      >
        <div className="space-y-6">
                  {/* Room Info Section */}
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
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your room"
                          rows={3}
                          className="w-full px-3 py-2 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/20 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={loading}
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
                      
                      <Button
                        onClick={handleRegenerateCode}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Regenerate Code
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone */}
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
        </div>
      </FloatingPanel>
    </>
  );
};