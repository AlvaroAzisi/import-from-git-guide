import React from 'react';
import { Check, X } from 'lucide-react';

export interface RoomRequestItemData {
  id: string;
  user_id: string;
  message?: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  user?: { username?: string | null; full_name?: string | null };
}

interface RoomRequestItemProps {
  request: RoomRequestItemData;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

const RoomRequestItem: React.FC<RoomRequestItemProps> = ({ request, onAccept, onDecline }) => {
  const title = request.user?.username ? `@${request.user.username}` : request.user?.full_name || request.user_id;
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
      <div>
        <div className="font-medium">{title}</div>
        {request.message && <div className="text-sm opacity-80 mt-1">{request.message}</div>}
        <div className="text-xs text-muted-foreground mt-1">{new Date(request.created_at).toLocaleString()}</div>
      </div>
      <div className="flex items-center gap-2">
        {request.status === 'pending' ? (
          <>
            <button onClick={() => onAccept(request.id)} className="inline-flex items-center gap-1 px-3 py-1 rounded bg-green-600 text-white">
              <Check className="w-4 h-4" /> Accept
            </button>
            <button onClick={() => onDecline(request.id)} className="inline-flex items-center gap-1 px-3 py-1 rounded border">
              <X className="w-4 h-4" /> Decline
            </button>
          </>
        ) : (
          <span className="text-sm capitalize">{request.status}</span>
        )}
      </div>
    </div>
  );
};

export default RoomRequestItem;
