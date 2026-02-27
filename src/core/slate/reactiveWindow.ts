import type { TodayPayload } from '@/src/core/today/types';

export type ReactiveWindow = {
  isReactive: boolean;
  reason: 'live_games' | 'first_tip_soon' | 'unknown';
  minutesToFirstTip?: number;
};

const ET_TIME = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*ET$/i;

function parseStartTime(startTime: string, generatedAt: string) {
  const etMatch = startTime.match(ET_TIME);
  if (etMatch) {
    const [, hRaw, minuteRaw, meridiemRaw] = etMatch;
    let hour = Number(hRaw) % 12;
    if ((meridiemRaw ?? 'AM').toUpperCase() === 'PM') hour += 12;
    const base = new Date(generatedAt);
    const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour + 5, Number(minuteRaw), 0));
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  if (/^q\d/i.test(startTime) || /'/.test(startTime)) return null;

  const direct = Date.parse(startTime);
  return Number.isNaN(direct) ? null : direct;
}

export function detectReactiveWindow(payload: TodayPayload, nowIso?: string): ReactiveWindow {
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();

  if (payload.games.some((game) => game.status === 'live') || payload.mode === 'live' && payload.games.some((game) => {
    const stamp = parseStartTime(game.startTime, payload.generatedAt);
    return stamp !== null && stamp <= nowMs;
  })) {
    return { isReactive: true, reason: 'live_games', minutesToFirstTip: 0 };
  }

  const parsedTimes = payload.games
    .map((game) => parseStartTime(game.startTime, payload.generatedAt))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  const firstTip = parsedTimes[0];
  if (typeof firstTip !== 'number') {
    return { isReactive: false, reason: 'unknown' };
  }

  const minutesToFirstTip = Math.round((firstTip - nowMs) / 60000);
  if (minutesToFirstTip <= 20 && minutesToFirstTip >= 0) {
    return { isReactive: true, reason: 'first_tip_soon', minutesToFirstTip };
  }

  return { isReactive: false, reason: 'unknown', minutesToFirstTip };
}
