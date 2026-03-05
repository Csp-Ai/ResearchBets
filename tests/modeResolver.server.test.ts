import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveRuntimeMode } from '@/src/core/live/modeResolver.server';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('runtime mode resolver', () => {
  it('respects demo requests above live eligibility', () => {
    const resolved = resolveRuntimeMode({ demoRequested: true });
    expect(resolved.mode).toBe('demo');
    expect(resolved.reason).toBe('demo_requested');
  });

  it('degrades to demo when provider fails', () => {
    const resolved = resolveRuntimeMode({ providerFailed: true });
    expect(resolved.mode).toBe('demo');
    expect(resolved.reason).not.toBe('live_ok');
    expect(resolved.publicLabel).toBe('Demo mode (live feeds off)');
  });
});
