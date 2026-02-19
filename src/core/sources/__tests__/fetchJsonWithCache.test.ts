import { describe, expect, it, vi } from 'vitest';

import { fetchJsonWithCache } from '../fetchJsonWithCache';

describe('fetchJsonWithCache', () => {
  it('returns cached payload inside ttl', async () => {
    const payload = { ok: true };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify(payload)
    }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchJsonWithCache<{ ok: boolean }>('https://example.com/test.json', {
      source: 'test',
      ttlMs: 60_000
    });
    const second = await fetchJsonWithCache<{ ok: boolean }>('https://example.com/test.json', {
      source: 'test',
      ttlMs: 60_000
    });

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
