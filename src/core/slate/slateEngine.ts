import type { TodayPayload } from '@/src/core/today/types';

export type SlateSummary = {
  preparedAtIso: string;
  narrative: string;
  bias: {
    pace: 'elevated' | 'neutral' | 'slow';
    scoring: 'overs' | 'unders' | 'mixed';
    assistTrend: boolean;
  };
  volatilityFlags: string[];
  prepConfidence: number;
};

function parseSpreadFromLine(line?: string) {
  if (!line) return null;
  const first = line.match(/-?\d+(?:\.\d+)?/);
  return first ? Math.abs(Number(first[0])) : null;
}

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

export function buildSlateSummary(payload: TodayPayload): SlateSummary {
  const board = payload.games.flatMap((game) => game.propsPreview);
  const gameCount = payload.games.length;
  const preparedAtIso = payload.generatedAt;

  const pointsLike = board.filter((prop) => ['points', 'total', 'pra', 'ra'].includes(prop.market));
  const assistLike = board.filter((prop) => prop.market === 'assists');
  const threesLike = board.filter((prop) => prop.market === 'threes');

  const avgHitRate = board.length > 0
    ? board.reduce((sum, prop) => sum + (prop.hitRateL10 ?? 55), 0) / board.length
    : 0;
  const avgPointsLine = pointsLike.length > 0
    ? pointsLike.reduce((sum, prop) => sum + (parseSpreadFromLine(prop.line) ?? 0), 0) / pointsLike.length
    : 0;

  const tightSpreadCount = board.filter((prop) => {
    const spread = parseSpreadFromLine(prop.line);
    return spread !== null && spread <= 4.5;
  }).length;

  const paceSignal = gameCount >= 5 || avgPointsLine >= 13 || tightSpreadCount >= Math.max(3, Math.floor(gameCount / 2));
  const slowSignal = gameCount <= 2 && avgPointsLine < 6;
  const pace: SlateSummary['bias']['pace'] = paceSignal ? 'elevated' : slowSignal ? 'slow' : 'neutral';

  const flags: string[] = [];
  if (threesLike.length >= Math.max(2, Math.floor(board.length * 0.25))) flags.push('High 3PT variance night');
  if (tightSpreadCount <= 1 && gameCount > 0) flags.push('Blowout risk in 1 matchup');
  if (payload.games.some((game) => game.status === 'live')) flags.push('Live window active');
  if (assistLike.length >= 3 && avgHitRate >= 58) flags.push('Assist lanes priced but still viable');

  const scoring: SlateSummary['bias']['scoring'] = avgPointsLine >= 12 && !flags.includes('Blowout risk in 1 matchup')
    ? 'overs'
    : avgPointsLine < 8 && pace === 'slow'
      ? 'unders'
      : 'mixed';

  const assistTrend = assistLike.length >= Math.max(2, Math.ceil(gameCount / 2))
    && (pace !== 'slow' || tightSpreadCount >= 2);

  const modeBase = payload.mode === 'live' ? 84 : payload.mode === 'cache' ? 74 : 68;
  const completeness = clamp(Math.round((gameCount / 6) * 22) + Math.round((board.length / 18) * 14), 0, 36);
  const quality = clamp(Math.round((avgHitRate - 50) * 0.7), 0, 12);
  const prepConfidence = clamp(modeBase + completeness + quality - (payload.reason ? 4 : 0), 0, 100);

  const narrative = [
    `Slate leans ${pace} pace with ${gameCount} games on deck and ${board.length} tracked board props feeding the first decision cycle.`,
    scoring === 'overs'
      ? 'Totals and role lines are shading toward overs, but books are already taxing premium scorers in popular spots.'
      : scoring === 'unders'
        ? 'Market tone is compressing into unders pockets, especially where game scripts project slower possession volume.'
        : 'Market shape is mixed tonight, so pick spots where role stability beats pure scoring variance.',
    assistTrend
      ? 'Assist props remain viable in tighter scripts, while rebounds look slightly inflated in late board refreshes.'
      : 'Assist lanes are more selective, and 3PT variance remains the swing factor for ceiling-oriented tickets.',
    flags.includes('High 3PT variance night')
      ? 'Treat threes as volatility ammo rather than core exposure and let peripheral stats carry survival.'
      : 'Builds can stay balanced if you avoid stacking correlated points ladders from the same matchup.'
  ].join(' ');

  return {
    preparedAtIso,
    narrative,
    bias: {
      pace,
      scoring,
      assistTrend
    },
    volatilityFlags: flags.slice(0, 4),
    prepConfidence
  };
}
