import { describe, expect, it, vi } from 'vitest';

import { runUiAction } from '../src/core/ui/actionContract';

describe('runUiAction', () => {
  it('returns standardized envelope shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const result = await runUiAction({ actionName: 'test_action', traceId: 't1', execute: async () => ({ ok: true, data: { id: 1 }, source: 'demo', degraded: true }) });
    expect(result).toMatchObject({ ok: true, source: 'demo', degraded: true, data: { id: 1 } });
  });
});
