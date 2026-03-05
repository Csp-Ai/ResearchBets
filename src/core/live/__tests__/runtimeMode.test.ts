import { describe, expect, it } from 'vitest';

import { parseUrlModeIntent, resolveRuntimeMode } from '@/src/core/live/runtimeMode';

describe('runtimeMode resolver', () => {
  it('returns null without explicit mode', () => {
    expect(parseUrlModeIntent(new URLSearchParams('sport=NBA'))).toBeNull();
  });

  it('prefers explicit demo', () => {
    const resolved = resolveRuntimeMode({
      urlIntent: 'demo',
      providerHealth: { mode: 'live', reason: 'live_ok' }
    });
    expect(resolved.mode).toBe('demo');
    expect(resolved.reason).toBe('explicit_demo');
  });

  it('falls through to provider-health when intent missing', () => {
    const resolved = resolveRuntimeMode({
      urlIntent: null,
      providerHealth: { mode: 'live', reason: 'live_ok' }
    });
    expect(resolved.mode).toBe('live');
  });
});
