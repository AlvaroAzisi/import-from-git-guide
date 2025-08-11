import React, { useState } from 'react';
import { Users, Hash } from 'lucide-react';
import { FloatingPanel } from '../ui/floating-panel';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string, description?: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    try {
      await onSuccess(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Create Group Chat"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Icon */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Create a group chat to collaborate with multiple study partners
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name..."
              required
              className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Create Group
              </>
            )}
          </Button>
        </div>
      </form>
    </FloatingPanel>
  );
};