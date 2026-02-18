import { afterEach, describe, expect, it, vi } from 'vitest';

import { runUiAction } from '../actionContract';
import { buildNavigationHref } from '../navigation';

describe('ui action contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits started then succeeded with the same trace_id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    } as Response);

    const outcome = await runUiAction({
      actionName: 'see_live_games',
      traceId: 'trace_chain_123',
      execute: async () => ({ ok: true, source: 'live' })
    });

    expect(outcome.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const started = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    const finished = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body));

    expect(started.event_name).toBe('ui_action_started');
    expect(finished.event_name).toBe('ui_action_succeeded');
    expect(started.trace_id).toBe('trace_chain_123');
    expect(finished.trace_id).toBe('trace_chain_123');
  });

  it('emits started then failed with the same trace_id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    } as Response);

    const outcome = await runUiAction({
      actionName: 'run_analysis',
      traceId: 'trace_chain_456',
      execute: async () => ({ ok: false, source: 'demo', error_code: 'analysis_failed' })
    });

    expect(outcome.ok).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const started = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    const finished = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body));

    expect(started.event_name).toBe('ui_action_started');
    expect(finished.event_name).toBe('ui_action_failed');
    expect(started.trace_id).toBe('trace_chain_456');
    expect(finished.trace_id).toBe('trace_chain_456');
  });
});

describe('buildNavigationHref', () => {
  it('propagates existing trace_id into CTA navigation URLs', () => {
    const href = buildNavigationHref({
      pathname: '/live',
      traceId: 'trace_chain_789',
      params: { sport: 'NFL', gameId: 'G123' }
    });

    const url = new URL(`https://example.com${href}`);
    expect(url.pathname).toBe('/live');
    expect(url.searchParams.get('trace_id')).toBe('trace_chain_789');
    expect(url.searchParams.get('sport')).toBe('NFL');
    expect(url.searchParams.get('gameId')).toBe('G123');
  });
});
