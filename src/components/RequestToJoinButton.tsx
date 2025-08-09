import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, Send, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { panelBase, panelHeader, panelTitle, panelActions } from '../styles/panelBase';

interface RequestToJoinButtonProps {
  roomId: string;
  disabled?: boolean;
}

export const RequestToJoinButton: React.FC<RequestToJoinButtonProps> = ({ roomId, disabled }) => {
  const { toast } = useToast();
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check existing request
    const check = async () => {
      const { data } = await supabase
        .from('room_requests')
        .select('id, status')
        .eq('room_id', roomId)
        .maybeSingle();
      if (data && (data.status === 'pending' || data.status === 'accepted')) setRequested(true);
    };
    check();
  }, [roomId]);

  const handleRequest = async () => {
    try {
      setLoading(true);
      // Prefer secure RPC that validates membership and duplicates
      const { error } = await supabase.rpc('create_room_request', { p_room_id: roomId, p_message: message || null });
      if (error) throw error;
      setRequested(true);
      toast({ title: 'Request sent', description: 'The admin will review your request shortly.' });
      setOpen(false);
      setMessage('');
    } catch (e: any) {
      toast({ title: 'Unable to request', description: e.message || 'Please try again later.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          className={`px-8 py-3 rounded-xl text-white ${requested ? 'bg-primary/60 cursor-default' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg'} transition-all`}
          onClick={() => !requested && setOpen(true)}
          disabled={disabled || requested || loading}
        >
          {requested ? (
            <span className="inline-flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Requested</span>
          ) : (
            <span className="inline-flex items-center gap-2"><Users className="w-4 h-4" /> Request to Join</span>
          )}
        </motion.button>
      </AnimatePresence>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className={`${panelBase} relative w-full max-w-md`}>
            <div className={panelHeader}>
              <h2 className={panelTitle}>Request to Join</h2>
              <div className={panelActions}>
                <button onClick={() => setOpen(false)} aria-label="Close" className="p-2 rounded hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium">Optional message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Tell the admin why you'd like to join…"
                className="w-full px-4 py-2 rounded-lg border bg-background"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button onClick={handleRequest} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
                  <Send className="w-4 h-4" /> {loading ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
