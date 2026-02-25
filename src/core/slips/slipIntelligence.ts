export type SlipIntelLeg = {
  id?: string;
  player?: string;
  selection?: string;
  marketType?: string;
  market?: string;
  line?: string;
  odds?: string;
  game?: string;
  matchup?: string;
  team?: string;
};

export type VolatilityTier = 'Low' | 'Med' | 'High' | 'Extreme';

export type SlipIntelligence = {
  correlationScore: number;
  fragilityScore: number;
  volatilityTier: VolatilityTier;
  sameGameStack: boolean;
  exposureSummary: {
    topGames: Array<{ game: string; count: number }>;
    topPlayers: Array<{ player: string; count: number }>;
  };
  weakestLegHints: string[];
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const parseAmericanOdds = (odds?: string): number | null => {
  if (!odds) return null;
  const normalized = odds.trim();
  const match = normalized.match(/^[+-]?\d+$/);
  if (!match) return null;
  return Number(normalized);
};

const normalizeLabel = (value?: string): string => value?.trim().toLowerCase() ?? '';

const inferGameKey = (leg: SlipIntelLeg): string => {
  if (leg.game) return leg.game;
  if (leg.matchup) return leg.matchup;
  if (leg.team) return `team:${leg.team}`;
  return 'Unlabeled game';
};

const inferPlayerKey = (leg: SlipIntelLeg): string => leg.player ?? leg.selection ?? 'Unknown player';

const lineLooksAlt = (line?: string): boolean => {
  if (!line) return false;
  const parsed = Number(line);
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(parsed) >= 30 || Number.isInteger(parsed);
};

export function computeSlipIntelligence(legs: SlipIntelLeg[]): SlipIntelligence {
  if (legs.length === 0) {
    return {
      correlationScore: 0,
      fragilityScore: 0,
      volatilityTier: 'Low',
      sameGameStack: false,
      exposureSummary: { topGames: [], topPlayers: [] },
      weakestLegHints: ['No legs yet — add props to see correlation and fragility checks.']
    };
  }

  const gameCounts = new Map<string, number>();
  const playerCounts = new Map<string, number>();
  let duplicatePlayerLegs = 0;
  let longshotLegs = 0;
  let altLineLegs = 0;

  for (const leg of legs) {
    const gameKey = inferGameKey(leg);
    gameCounts.set(gameKey, (gameCounts.get(gameKey) ?? 0) + 1);

    const playerKey = inferPlayerKey(leg);
    const nextPlayerCount = (playerCounts.get(playerKey) ?? 0) + 1;
    playerCounts.set(playerKey, nextPlayerCount);
    if (nextPlayerCount > 1) duplicatePlayerLegs += 1;

    const odds = parseAmericanOdds(leg.odds);
    if (odds !== null && odds >= 150) longshotLegs += 1;
    if (lineLooksAlt(leg.line) || (odds !== null && odds >= 120)) altLineLegs += 1;
  }

  const topGameCount = Math.max(...gameCounts.values());
  const sameGamePct = (topGameCount / legs.length) * 100;
  const duplicatePlayerPct = (duplicatePlayerLegs / legs.length) * 100;
  const sameGameStack = topGameCount >= 4;

  const correlationScore = clampScore((sameGamePct * 0.75) + (duplicatePlayerPct * 0.25) + (sameGameStack ? 15 : 0));

  const baseFragility = legs.length * 8;
  const correlationFragility = correlationScore * 0.4;
  const altFragility = (altLineLegs / legs.length) * 25;
  const longshotFragility = (longshotLegs / legs.length) * 30;
  const fragilityScore = clampScore(baseFragility + correlationFragility + altFragility + longshotFragility);

  const volatilityTier: VolatilityTier = fragilityScore >= 85
    ? 'Extreme'
    : fragilityScore >= 65
      ? 'High'
      : fragilityScore >= 40
        ? 'Med'
        : 'Low';

  const topGames = [...gameCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([game, count]) => ({ game, count }));

  const topPlayers = [...playerCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([player, count]) => ({ player, count }));

  const weakestLegHints: string[] = [];
  if (sameGameStack) weakestLegHints.push(`${topGames[0]?.count ?? topGameCount} legs tied to ${topGames[0]?.game ?? 'one game'} — one script can sink the whole slip.`);
  if (duplicatePlayerLegs > 0) weakestLegHints.push('Multiple legs rely on the same player hitting multiple outcomes.');
  if (longshotLegs > 0) weakestLegHints.push(`${longshotLegs} longshot leg${longshotLegs === 1 ? '' : 's'} adds tail risk.`);
  if (altLineLegs > 0) weakestLegHints.push(`${altLineLegs} leg${altLineLegs === 1 ? '' : 's'} appear to be alt or aggressive lines.`);
  if (weakestLegHints.length === 0) weakestLegHints.push('No major concentration flags detected; risk is spread across legs.');

  return {
    correlationScore,
    fragilityScore,
    volatilityTier,
    sameGameStack,
    exposureSummary: { topGames, topPlayers },
    weakestLegHints
  };
}

export const toIntelLegFromText = (selection: string): SlipIntelLeg => {
  const normalized = normalizeLabel(selection);
  return {
    selection,
    player: selection.split(/\s+over|\s+under/i)[0]?.trim() || selection,
    game: normalized.includes(' @ ') ? selection : undefined
  };
};
