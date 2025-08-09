import React, { useState } from 'react';
import { panelBase, panelHeader, panelTitle, panelActions } from '@/styles/panelBase';
import { X, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (groupId: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('groups').insert({ name }).select('id').single();
      if (error) throw error;
      toast({ title: 'Group created' });
      onCreated?.(data.id);
      onClose();
    } catch (e: any) {
      toast({ title: 'Could not create group', description: e.message ?? 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className={`${panelBase} relative w-full max-w-md`}>
        <div className={panelHeader}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className={panelTitle}>Create Group</h2>
          </div>
          <div className={panelActions}>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">Group name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Study Group"
            className="w-full px-4 py-2 rounded-lg border bg-background"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
            <button type="submit" disabled={loading || !name} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
