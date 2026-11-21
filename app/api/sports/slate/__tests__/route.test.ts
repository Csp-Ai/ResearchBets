import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doMock('@/src/core/env/read.server', () => ({ resolveWithAliases: () => 'test-key' }));
  vi.doMock('@/src/core/providers/registry.server', () => ({
    getProviderRegistry: () => ({
      oddsProvider: { id: 'the-odds-api', fetchEvents },
    }),
  }));
});

describe('provider-backed schedule-only sports API', () => {
  it('uses viewer-local dates and never invents missing games', async () => {
    const { verifiedScheduleEvents } = await import('../route');
    const events = [
      { id: 'g1', commence_time: '2026-11-22T03:00:00Z', home_team: 'B', away_team: 'A' },
      { id: 'g2', commence_time: '2026-11-22T13:00:00Z', home_team: 'D', away_team: 'C' },
      { id: 'g3', commence_time: '2026-11-22T03:00:00Z', home_team: '', away_team: 'A' },
    ];
    const games = verifiedScheduleEvents(events, 'NBA', 'America/Phoenix', '2026-11-21', Date.parse('2026-11-22T02:00:00Z'));
    expect(games.map((g) => g.id)).toEqual(['g1']);
    expect(games[0]?.startTimeISO).toBe('2026-11-22T03:00:00Z');
    expect(games[0]?.propsPreview).toEqual([]);
  });

  it('rejects unsupported sport before querying the provider', async () => {
    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost/api/sports/slate?sport=NCAAF'));
    expect(response.status).toBe(400);
    expect(fetchEvents).not.toHaveBeenCalled();
  });

  it('returns a verified schedule without requiring player props', async () => {
    fetchEvents.mockResolvedValueOnce({
      events: [{ id: 'event1', commence_time: '2026-11-22T03:00:00Z', home_team: 'Home', away_team: 'Away' }]
    });
    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost/api/sports/slate?sport=NBA&date=2026-11-21&tz=America/Phoenix'));
    const body = await response.json() as { ok: boolean; data: { games: unknown[]; board: unknown[]; mode: string } };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.board).toEqual([]);
    expect(body.data.mode).toBe('live');
  });

  it('never converts missing provider coverage into demo fixtures', async () => {
    fetchEvents.mockRejectedValueOnce(new Error('upstream failed'));
    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost/api/sports/slate?sport=NHL&date=2026-11-21&tz=America/Phoenix'));
    const body = await response.json() as { ok: boolean; reason?: string; data: unknown };
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, data: null, reason: 'schedule_provider_unavailable' });
  });
});
