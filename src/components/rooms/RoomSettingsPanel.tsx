import React, { useState } from 'react';
import { Save, RefreshCw, Trash2, Lock, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useToast } from '../../hooks/useToast';
import { updateRoomSettings, regenerateRoomCode, deleteRoom } from '../../lib/rooms';
import type { Room } from '../../types/room';

interface RoomSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onUpdate: (updates: Partial<Room>) => void;
  onDelete: () => void;
}

export const RoomSettingsPanel: React.FC<RoomSettingsPanelProps> = ({
  isOpen,
  onClose,
  room,
  onUpdate,
  onDelete,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'danger'>('general');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: room.name,
    description: room.description || '',
    subject: room.subject || '',
    is_public: room.is_public ?? true,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { success, error } = await updateRoomSettings(room.id, formData);
      
      if (success) {
        onUpdate(formData);
        toast({
          title: 'Success',
          description: 'Room settings updated',
        });
        onClose();
      } else {
        toast({
          title: 'Error',
          description: error || 'Failed to update settings',
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    const { success, code, error } = await regenerateRoomCode(room.id);
    
    if (success && code) {
      onUpdate({ short_code: code, join_code: code });
      toast({
        title: 'Success',
        description: `New code: ${code}`,
      });
    } else {
      toast({
        title: 'Error',
        description: error || 'Failed to regenerate code',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    const { success, error } = await deleteRoom(room.id);
    
    if (success) {
      toast({
        title: 'Success',
        description: 'Room deleted',
      });
      onDelete();
    } else {
      toast({
        title: 'Error',
        description: error || 'Failed to delete room',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border pb-2">
            {(['general', 'privacy', 'danger'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto py-4">
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Room Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter room name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your study room"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Subject/Tag</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Mathematics, Physics"
                  />
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Room Visibility</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setFormData({ ...formData, is_public: true })}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        formData.is_public
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Globe className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-medium">Public</p>
                      <p className="text-xs text-muted-foreground">Anyone can join</p>
                    </button>

                    <button
                      onClick={() => setFormData({ ...formData, is_public: false })}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        !formData.is_public
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Lock className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-medium">Private</p>
                      <p className="text-xs text-muted-foreground">Invite only</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Join Code</label>
                  <div className="flex gap-2">
                    <Input value={room.short_code || 'N/A'} readOnly />
                    <Button
                      onClick={handleRegenerateCode}
                      variant="outline"
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share this code with others to let them join
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-destructive/50 bg-destructive/10">
                  <h4 className="font-semibold text-destructive mb-2">Delete Room</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    This action cannot be undone. All messages and member data will be permanently
                    deleted.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Room
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {activeTab !== 'danger' && (
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this room? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleDelete();
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
