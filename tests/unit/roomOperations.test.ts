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

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          status: 'ok',
          room: { id: 'room-123', name: 'Test Room' },
          membership: { id: 'member-123' }
        },
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
        p_user_id: 'user-123',
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

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          status: 'ok',
          code: 'JOINED',
          room_id: 'room-123',
          room: { id: 'room-123', name: 'Test Room' }
        },
        error: null
      });

      const result = await joinRoom('room-123');

      expect(result.success).toBe(true);
      expect(result.room_id).toBe('room-123');
    });

    it('should handle already member case', async () => {
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          status: 'ok',
          code: 'ALREADY_MEMBER',
          room_id: 'room-123'
        },
        error: null
      });

      const result = await joinRoom('room-123');

      expect(result.success).toBe(true);
      expect(result.code).toBe('ALREADY_MEMBER');
    });
  });
});