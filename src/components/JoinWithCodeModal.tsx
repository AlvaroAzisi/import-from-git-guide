import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { panelBase, panelHeader, panelTitle, panelActions } from '../styles/panelBase';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../hooks/useToast';

interface JoinWithCodeModalProps {
  open: boolean;
  onClose: () => void;
  onJoined?: (roomId: string) => void;
}

const JoinWithCodeModal: React.FC<JoinWithCodeModalProps> = ({ open, onClose, onJoined }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_join_code', { p_code: code.trim() });
      if (error) throw error;

      // Expecting shape { room_id: string, valid: boolean } or an array of rows
      const result = Array.isArray(data) ? data[0] : data;
      if (!result || result.valid === false) {
        toast({ title: 'Invalid or expired code', description: 'Please check and try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'You have joined the room.' });
      onJoined?.(result.room_id);
      onClose();
    } catch (err: any) {
      toast({ title: 'Could not join', description: err.message ?? 'Please try again later.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" className={`${panelBase} relative w-full max-w-md`}>
        <div className={panelHeader}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <h2 className={panelTitle}>Join with Code</h2>
          </div>
          <div className={panelActions}>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">Enter invite code</label>
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            className="w-full px-4 py-2 rounded-lg border bg-background"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
            <button type="submit" disabled={loading || !code} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
              {loading ? 'Joining…' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinWithCodeModal;
