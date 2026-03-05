import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCockpitEntryHref } from '@/src/core/routing/cockpitEntry';
import { normalizeSpine } from '@/src/core/nervous/spine';
import { toHref } from '@/src/core/nervous/routes';

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

  it('home page renders canonical landing composition (no redirect)', async () => {
    const mod = await import('@/app/page');
    const element = mod.default({ searchParams: { trace_id: 'trace_root', source: 'root' } }) as {
      type?: { name?: string };
      props?: { searchParams?: { trace_id?: string; source?: string } };
    };

    expect(element.type?.name).toBe('CanonicalLanding');
    expect(element.props?.searchParams?.trace_id).toBe('trace_root');
    expect(element.props?.searchParams?.source).toBe('root');
  });

  it('landing alias redirects to / and preserves query', async () => {
    const redirect = vi.fn((to: string) => {
      throw new Error(`REDIRECT:${to}`);
    });

    vi.doMock('next/navigation', () => ({ redirect }));
    const mod = await import('@/app/landing/page');

    expect(() => mod.default({ searchParams: { trace_id: 'trace_legacy', source: 'legacy' } })).toThrow(
      'REDIRECT:/?trace_id=trace_legacy&source=legacy'
    );
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('trace_id=trace_legacy'));
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('source=legacy'));
  });

  it('live alias uses canonical toHref tab redirect and preserves spine keys', async () => {
    const redirect = vi.fn((to: string) => {
      throw new Error(`REDIRECT:${to}`);
    });

    vi.doMock('next/navigation', () => ({ redirect }));
    const mod = await import('@/app/(product)/live/page');

    const input = {
      trace_id: 'trace-live',
      sport: 'nfl',
      tz: 'UTC',
      date: '2026-02-28',
      mode: 'cache'
    };

    const expected = toHref('/control', normalizeSpine(input), { tab: 'live' });
    expect(() => mod.default({ searchParams: input })).toThrow(`REDIRECT:${expected}`);
    expect(redirect).toHaveBeenCalledWith(expected);
  });
});
