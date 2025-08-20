// Unit tests for room operations
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoomAndJoin, joinRoom, leaveRoom } from '../../src/lib/roomOperations';
import { supabase } from '../../src/lib/supabase';

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('Room Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('createRoomAndJoin', () => {
    it('should create room and join successfully', async () => {
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const mockResult = {
        success: true,
        room: { id: 'room-123', name: 'Test Room' },
        membership: { role: 'admin' }
      };
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      });

      const result = await createRoomAndJoin({
        name: 'Test Room',
        description: 'Test Description',
        subject: 'Mathematics'
      });

      expect(result.success).toBe(true);
      expect(result.room_id).toBe('room-123');
      expect(supabase.rpc).toHaveBeenCalledWith('create_room_and_join', {
        p_name: 'Test Room',
        p_description: 'Test Description',
        p_subject: 'Mathematics',
        p_is_public: true,
        p_max_members: 10
      });
    });

    it('should handle authentication failure', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const result = await createRoomAndJoin({
        name: 'Test Room'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_AUTHENTICATED');
      expect(localStorage.getItem('kupintar_pending_room_create')).toBeTruthy();
    });

    it('should handle RPC errors', async () => {
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Room name already exists' }
      });

      const result = await createRoomAndJoin({
        name: 'Duplicate Room'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room name already exists');
    });
  });

  describe('joinRoom', () => {
    it('should join room successfully', async () => {
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const mockResult = {
        success: true,
        code: 'JOINED',
        room_id: 'room-123'
      };
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      });

      const result = await joinRoom('room-123');

      expect(result.success).toBe(true);
      expect(result.room_id).toBe('room-123');
      expect(supabase.rpc).toHaveBeenCalledWith('join_room_safe', {
        p_room_identifier: 'room-123'
      });
    });

    it('should handle already member case', async () => {
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const mockResult = {
        success: true,
        code: 'ALREADY_MEMBER',
        room_id: 'room-123'
      };
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      });

      const result = await joinRoom('room-123');

      expect(result.success).toBe(true);
      expect(result.code).toBe('ALREADY_MEMBER');
    });

    it('should handle room not found', async () => {
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const mockResult = {
        success: false,
        code: 'ROOM_NOT_FOUND',
        error: 'Room not found or inactive'
      };
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      });

      const result = await joinRoom('invalid-room');

      expect(result.success).toBe(false);
      expect(result.code).toBe('ROOM_NOT_FOUND');
      expect(result.error).toBe('Room not found or inactive');
    });
  });

  describe('leaveRoom', () => {
    it('should leave room successfully', async () => {
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock the delete operation
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockReturnValue({ error: null });
      
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: mockEq
          })
        })
      } as any);

      const result = await leaveRoom('room-123');

      expect(result.success).toBe(true);
      expect(result.room_id).toBe('room-123');
    });
  });
});