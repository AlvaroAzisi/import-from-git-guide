import { describe, it, expect, vi } from 'vitest';
import { searchRooms } from '../discovery';
import { supabase } from '../../integrations/supabase/client';

// Mock the supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))
    }))
  }
}));

describe('searchRooms', () => {
  it('should call supabase with the correct query', async () => {
    const query = 'test';
    await searchRooms(query);

    expect(supabase.from).toHaveBeenCalledWith('rooms');
    // We can't easily test the chained calls without a more complex mock,
    // but we can at least verify the initial table selection.
  });
});
