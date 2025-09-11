// Canonical Room type definition
export interface Room {
  id: string;
  name: string;
  description?: string | null;
  subject?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean;
  is_public?: boolean;
  max_members?: number;
  short_code?: string | null;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface CreateRoomPayload {
  name: string;
  description?: string;
  subject?: string;
  is_public?: boolean;
  max_members?: number;
}

export interface JoinRoomResponse {
  success: boolean;
  room?: Room;
  membership?: RoomMember;
  error?: string;
  code?: 'ROOM_NOT_FOUND' | 'ALREADY_MEMBER' | 'MAX_CAPACITY' | 'ROOM_PRIVATE' | 'GENERAL_ERROR';
}