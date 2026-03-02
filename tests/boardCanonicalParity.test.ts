import { describe, expect, it } from 'vitest';

import { getBoardData } from '@/src/core/board/boardService.server';
import { resolveToday } from '@/src/core/today/resolveToday.server';
import { MIN_BOARD_ROWS, selectBoardViewFromToday } from '@/src/core/today/service.server';

describe('board canonical parity', () => {
  it('same spine returns matching served mode and reason for today and board adapter', async () => {
    const spine = { sport: 'NBA' as const, date: '2026-01-15', tz: 'America/Phoenix', mode: 'demo' as const };
    const todayPayload = await resolveToday(spine);
    const boardPayload = await getBoardData({ sport: spine.sport, date: spine.date, tz: spine.tz, demoRequested: spine.mode === 'demo' });
    const boardView = selectBoardViewFromToday(todayPayload);

    expect(boardPayload.mode).toBe(boardView.mode);
    expect(boardPayload.reason).toBe(boardView.reason);
    expect(boardPayload.generatedAt).toBeTruthy();
    expect(boardPayload.games.length).toBe(boardView.games.length);
  });

  it('demo fallback keeps stable board density via canonical today spine', async () => {
    const spine = { sport: 'NBA' as const, date: '2026-01-15', tz: 'America/Phoenix', mode: 'demo' as const };
    const todayPayload = await resolveToday(spine);
    const boardPayload = await getBoardData({ sport: spine.sport, date: spine.date, tz: spine.tz, demoRequested: true });

    expect((todayPayload.board ?? []).length).toBeGreaterThanOrEqual(MIN_BOARD_ROWS);
    expect(boardPayload.mode).toBe(todayPayload.mode);
    expect(boardPayload.reason).toBe(todayPayload.reason);
    expect(boardPayload.scouts.length).toBeGreaterThan(0);
  });
});
