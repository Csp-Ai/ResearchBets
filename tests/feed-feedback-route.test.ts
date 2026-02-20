import { describe, expect, it, vi } from 'vitest';

const upsert = vi.fn(async () => ({ error: null }));

vi.mock('@/src/services/supabase', () => ({
  getSupabaseServiceClient: () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
    from: vi.fn(() => ({ upsert }))
  })
}));

import { POST } from '../app/api/feed/[post_id]/feedback/route';

describe('POST /api/feed/[post_id]/feedback', () => {
  it('requires auth', async () => {
    const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ value: 'up' }) }), { params: { post_id: 'abc' } });
    expect(response.status).toBe(401);
  });

  it('upserts feedback when payload and auth are valid', async () => {
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'down' })
      }),
      { params: { post_id: 'abc' } }
    );

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith({ post_id: 'abc', user_id: 'user-1', value: 'down' }, { onConflict: 'post_id,user_id' });
  });
});
