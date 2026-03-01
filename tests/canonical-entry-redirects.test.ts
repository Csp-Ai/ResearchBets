import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCockpitEntryHref } from '@/src/core/routing/cockpitEntry';

describe('cockpit canonical entry redirects', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('builds /cockpit redirect from / with normalized defaults in demo mode', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T07:00:00.000Z'));
    vi.stubEnv('LIVE_MODE', 'false');

    const href = buildCockpitEntryHref();
    expect(href).toBe('/cockpit?sport=NBA&tz=America%2FPhoenix&date=2026-03-01&mode=demo&trace_id=trace_demo_cockpit');
  });

  it('preserves provided spine query keys and extra params', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T07:00:00.000Z'));

    const href = buildCockpitEntryHref({
      sport: 'NFL',
      tz: 'America/New_York',
      date: '2026-02-28',
      mode: 'cache',
      trace_id: 'trace_custom',
      foo: 'bar'
    });

    expect(href).toBe('/cockpit?sport=NFL&tz=America%2FNew_York&date=2026-02-28&mode=cache&trace_id=trace_custom&foo=bar');
  });

  it('home page issues a server redirect to cockpit', async () => {
    const redirect = vi.fn((to: string) => {
      throw new Error(`REDIRECT:${to}`);
    });

    vi.doMock('next/navigation', () => ({ redirect }));
    const mod = await import('@/app/(home)/page');

    expect(() => mod.default({ searchParams: { sport: 'NBA', mode: 'demo' } })).toThrow('REDIRECT:/cockpit?sport=NBA&tz=America%2FPhoenix&date=');
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it('landing alias redirects to cockpit and preserves query', async () => {
    const redirect = vi.fn((to: string) => {
      throw new Error(`REDIRECT:${to}`);
    });

    vi.doMock('next/navigation', () => ({ redirect }));
    const mod = await import('@/app/landing/page');

    expect(() => mod.default({ searchParams: { trace_id: 'trace_legacy', source: 'legacy' } })).toThrow(
      'REDIRECT:/cockpit?sport=NBA&tz=America%2FPhoenix&date='
    );
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('trace_id=trace_legacy'));
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('source=legacy'));
  });
});
