import { describe, expect, it } from 'vitest';

import { GET as getGameById } from '../app/api/games/[id]/route';
import { GET as searchGames } from '../app/api/games/search/route';
import { GET as getLiveGame } from '../app/api/live/game/[gameId]/route';
import { GET as getLiveMarket } from '../app/api/live/market/route';
import { POST as postLiveModel } from '../app/api/live/model/route';
import { MarketSnapshotSchema } from '../src/core/contracts/terminalSchemas';
import { getMarketSnapshot } from '../src/core/markets/marketData';

const requiredKeys = ['ok', 'data', 'degraded', 'source', 'error_code', 'trace_id'] as const;

const expectEnvelopeKeys = (payload: Record<string, unknown>) => {
  for (const key of requiredKeys) {
    expect(payload).toHaveProperty(key);
  }
};

describe('API envelope contract', () => {
  it('wraps games search responses in the standard envelope', async () => {
    const response = await searchGames(new Request('http://localhost/api/games/search?q=NFL_DEMO_1&trace_id=t_search'));
    const json = (await response.json()) as Record<string, unknown>;

    expectEnvelopeKeys(json);
    expect(json.ok).toBe(true);
    expect(json.trace_id).toBe('t_search');
    expect(json.data).toMatchObject({ games: expect.any(Array) });
  });

  it('wraps game detail success and not found responses in the standard envelope', async () => {
    const okResponse = await getGameById(new Request('http://localhost/api/games/NFL_DEMO_1'), {
      params: { id: 'NFL_DEMO_1' }
    });
    const okJson = (await okResponse.json()) as Record<string, unknown>;

    expectEnvelopeKeys(okJson);
    expect(okJson.ok).toBe(true);
    expect(okJson.data).toMatchObject({ game: expect.any(Object) });

    const notFoundResponse = await getGameById(new Request('http://localhost/api/games/MISSING?trace_id=t_nf'), {
      params: { id: 'MISSING' }
    });
    const notFoundJson = (await notFoundResponse.json()) as Record<string, unknown>;

    expectEnvelopeKeys(notFoundJson);
    expect(notFoundResponse.status).toBe(404);
    expect(notFoundJson.ok).toBe(false);
    expect(notFoundJson.error_code).toBe('not_found');
    expect(notFoundJson.trace_id).toBe('t_nf');
  });

  it('wraps live market responses in the standard envelope', async () => {
    const response = await getLiveMarket(
      new Request('http://localhost/api/live/market?sport=NFL', {
        headers: { 'x-trace-id': 't_market' }
      })
    );
    const json = (await response.json()) as Record<string, unknown>;

    expectEnvelopeKeys(json);
    expect(json.ok).toBe(true);
    expect(json.trace_id).toBe('t_market');
    expect(json.data).toMatchObject({
      run_id: expect.any(String),
      snapshot: expect.objectContaining({ games: expect.any(Array) })
    });
  });

  it('wraps live game responses in the standard envelope', async () => {
    const response = await getLiveGame(
      new Request('http://localhost/api/live/game/NFL_DEMO_1?sport=NFL&trace_id=t_live_game'),
      { params: { gameId: 'NFL_DEMO_1' } }
    );
    const json = (await response.json()) as Record<string, unknown>;

    expectEnvelopeKeys(json);
    expect(json.ok).toBe(true);
    expect(json.trace_id).toBe('t_live_game');
    expect(json.data).toMatchObject({
      run_id: expect.any(String),
      game: expect.objectContaining({ gameId: 'NFL_DEMO_1' }),
      model: expect.any(Object),
      props: expect.any(Array)
    });
  });

  it('wraps live model responses in the standard envelope', async () => {
    const snapshot = await getMarketSnapshot({ sport: 'NFL' });
    expect(MarketSnapshotSchema.safeParse(snapshot).success).toBe(true);
    const firstGame = snapshot.games[0];
    expect(firstGame).toBeDefined();
    if (!firstGame) throw new Error('Expected at least one game in snapshot.');

    const okResponse = await postLiveModel(
      new Request('http://localhost/api/live/model', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId: firstGame.gameId, sport: 'NFL', traceId: 't_model' })
      })
    );
    const okJson = (await okResponse.json()) as Record<string, unknown>;

    expectEnvelopeKeys(okJson);
    expect(okJson.ok).toBe(true);
    expect(okJson.trace_id).toBe('t_model');
    expect(okJson.data).toMatchObject({ gameId: firstGame.gameId });

    const notFoundResponse = await postLiveModel(
      new Request('http://localhost/api/live/model?trace_id=t_model_nf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId: 'MISSING', sport: 'NFL' })
      })
    );
    const notFoundJson = (await notFoundResponse.json()) as Record<string, unknown>;

    expectEnvelopeKeys(notFoundJson);
    expect(notFoundResponse.status).toBe(404);
    expect(notFoundJson.ok).toBe(false);
    expect(notFoundJson.error_code).toBe('game_not_found');
    expect(notFoundJson.trace_id).toBe('t_model_nf');
  });
});
