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
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
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

      const mockConversation = { id: 'conv-123', name: 'Test Room' };
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockConversation,
              error: null
            })
          }))
        }))
      } as any);

      const result = await createRoomAndJoin({
        name: 'Test Room',
        description: 'Test Description',
        subject: 'Mathematics'
      });

      expect(result.success).toBe(true);
      expect(result.room_id).toBe('conv-123');
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

      const mockConversation = { id: 'conv-123', name: 'Test Room' };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockConversation,
              error: null
            })
          }))
        }))
      } as any);

      const result = await joinRoom('conv-123');

      expect(result.success).toBe(true);
      expect(result.room_id).toBe('conv-123');
    });

    it('should handle already member case', async () => {
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock existing member check
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'member-123' },
              error: null
            })
          }))
        }))
      } as any);

      const result = await joinRoom('conv-123');

      expect(result.success).toBe(true);
      expect(result.code).toBe('ALREADY_MEMBER');
    });
  });
});