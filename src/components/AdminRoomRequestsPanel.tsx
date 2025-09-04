import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, X, Check, XCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';

interface AdminRoomRequestsPanelProps {
  roomId: string;
  isCreator: boolean;
}

export const AdminRoomRequestsPanel: React.FC<AdminRoomRequestsPanelProps> = ({ roomId, isCreator }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!isCreator) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('room_requests')
        .select('id, status, created_at, user_id, profiles!inner(full_name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      if (!error) setRequests(data || []);
    };
    load();

    const channel = supabase
      .channel(`requests-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_requests', filter: `room_id=eq.${roomId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, isCreator]);

  const patch = async (id: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase.from('room_requests').update({ status }).eq('id', id);
    if (error) toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    else toast({ title: `Request ${status}` });
  };

  if (!isCreator) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-xl transition-colors" title="Manage Requests">
        <Users className="w-5 h-5" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/20">
                  <h2 className="text-xl font-bold">Join Requests</h2>
                  <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/20 rounded-xl"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                  {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-2xl border border-white/20 dark:border-gray-700/20 p-3 backdrop-blur-sm bg-white/40 dark:bg-gray-800/40">
                      <div>
                        <p className="font-medium">{r.profiles?.full_name || r.user_id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => patch(r.id, 'accepted')} className="px-3 py-1 rounded-lg bg-emerald-500/80 text-white hover:bg-emerald-600 inline-flex items-center gap-1"><Check className="w-4 h-4" /> Accept</button>
                        <button onClick={() => patch(r.id, 'declined')} className="px-3 py-1 rounded-lg bg-red-500/80 text-white hover:bg-red-600 inline-flex items-center gap-1"><XCircle className="w-4 h-4" /> Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
