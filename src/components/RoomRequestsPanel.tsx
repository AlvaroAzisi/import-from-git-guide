import React, { useEffect, useState } from 'react';
import { panelBase, panelHeader, panelTitle } from '@/styles/panelBase';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import RoomRequestItem, { RoomRequestItemData } from './RoomRequestItem';
import { Users } from 'lucide-react';
import { subscribeToRoomRequests } from '@/lib/supabaseRealtime';

interface RoomRequestsPanelProps {
  roomId: string;
  isAdmin: boolean;
}

const RoomRequestsPanel: React.FC<RoomRequestsPanelProps> = ({ roomId, isAdmin }) => {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<RoomRequestItemData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !isAdmin) return;
    let unsubscribe: (() => void) | null = null;

    async function load() {
      const { data, error } = await supabase
        .from('room_requests')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      if (!error) setRequests((data as any) ?? []);
    }

    load();
    unsubscribe = subscribeToRoomRequests(roomId, () => load());
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [open, roomId, isAdmin]);

  const accept = async (id: string) => {
    try {
      const { error } = await supabase.rpc('accept_room_request', { p_request_id: id });
      if (error) throw error;
      toast({ title: 'Accepted', description: 'User added to the room.' });
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message ?? 'Please try again.', variant: 'destructive' });
    }
  };

  const decline = async (id: string) => {
    try {
      const { error } = await supabase.rpc('decline_room_request', { p_request_id: id });
      if (error) throw error;
      toast({ title: 'Declined', description: 'The request was declined.' });
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message ?? 'Please try again.', variant: 'destructive' });
    }
  };

  if (!isAdmin) return null;

  return (
    <div>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border">
        <Users className="w-4 h-4" /> Requests
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className={`${panelBase} relative w-full max-w-lg`}>
            <div className={panelHeader}>
              <h2 className={panelTitle}>Join Requests</h2>
              <button onClick={() => setOpen(false)} className="p-2 rounded hover:bg-muted">Close</button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {requests.length === 0 ? (
                <div className="text-sm text-muted-foreground">No requests yet.</div>
              ) : (
                requests.map((r) => (
                  <RoomRequestItem key={r.id} request={r} onAccept={accept} onDecline={decline} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomRequestsPanel;
