import { Tables, TablesInsert } from './supabase';

// Canonical Room type definition
export type Room = Tables<"rooms">;

export type RoomMember = Tables<"room_members">;

export type RoomMemberWithProfile = RoomMember & {
  profiles: Pick<Tables<"profiles">, "id" | "username" | "full_name" | "avatar_url"> | null;
};

export type CreateRoomPayload = TablesInsert<"rooms">;

export interface JoinRoomResponse {
  success: boolean;
  room?: Room;
  membership?: RoomMember;
  error?: string;
  code?: 'ROOM_NOT_FOUND' | 'ALREADY_MEMBER' | 'MAX_CAPACITY' | 'ROOM_PRIVATE' | 'GENERAL_ERROR';
}
