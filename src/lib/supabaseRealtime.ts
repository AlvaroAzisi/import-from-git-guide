// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';

export type Unsubscribe = () => void;

export function subscribeToTableInserts(
  channelName: string,
  table: string,
  filter: string,
  onInsert: (row: any) => void
): Unsubscribe {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table, filter },
      (payload: any) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToRoomRequests(
  roomId: string,
  onChange: (row: any) => void
): Unsubscribe {
  const channel = supabase
    .channel(`room-requests-${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_requests', filter: `room_id=eq.${roomId}` },
      (payload: any) => onChange(payload.new ?? payload.old)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToRoomMessages(
  roomId: string,
  onInsert: (row: any) => void
): Unsubscribe {
  return subscribeToTableInserts(`messages-room-${roomId}`, 'messages', `room_id=eq.${roomId}`, onInsert);
}

export function subscribeToGroupMessages(
  groupId: string,
  onInsert: (row: any) => void
): Unsubscribe {
  const channel = supabase
    .channel(`group-messages-${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
      (payload: any) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
