import type { SlipDraft, SlipLeg } from '@/src/core/contracts/slip';
import { ensureLegIds } from '@/src/core/contracts/slip';
import type { CorrelationEdge, ReportLeg, ScriptCluster, SlipStructureReport } from '@/src/core/contracts/slipStructureReport';

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

const parseNumericLine = (line?: string): number | undefined => {
  if (!line) return undefined;
  const parsed = Number(line);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeLabel = (value?: string): string => value?.trim().toLowerCase() ?? '';

const inferGameKey = (leg: Pick<SlipIntelLeg, 'game' | 'matchup' | 'team'>): string => {
  if (leg.game) return leg.game;
  if (leg.matchup) return leg.matchup;
  if (leg.team) return `team:${leg.team}`;
  return 'Unlabeled game';
};

const inferPlayerKey = (leg: Pick<SlipIntelLeg, 'player' | 'selection'>): string => leg.player ?? leg.selection ?? 'Unknown player';

const lineLooksAlt = (line?: string): boolean => {
  if (!line) return false;
  const parsed = Number(line);
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(parsed) >= 30 || Number.isInteger(parsed);
};

const toSlipLeg = (leg: SlipIntelLeg, index: number): SlipLeg => ({
  leg_id: leg.id ?? `legacy-${index}`,
  game_id: leg.game ?? leg.matchup,
  team: leg.team,
  player: leg.player,
  market: leg.market ?? leg.marketType ?? 'market',
  line: parseNumericLine(leg.line),
  odds: leg.odds,
  notes: leg.selection,
  side: normalizeLabel(leg.selection).includes(' under ') ? 'under' : normalizeLabel(leg.selection).includes(' over ') ? 'over' : undefined
});

const toIntelLeg = (leg: ReportLeg): SlipIntelLeg => ({
  id: leg.leg_id,
  player: leg.player,
  selection: leg.notes,
  market: leg.market,
  line: typeof leg.line === 'number' ? `${leg.line}` : undefined,
  odds: typeof leg.odds === 'number' ? `${leg.odds}` : leg.odds,
  game: leg.game_id,
  team: leg.team
});

const bandFromScore = (score: number): 'low' | 'med' | 'high' => (score >= 67 ? 'high' : score >= 40 ? 'med' : 'low');

export function buildSlipStructureReport(
  input: SlipDraft | SlipIntelLeg[] | SlipLeg[],
  context?: { trace_id?: string; slip_id?: string; mode?: 'live' | 'cache' | 'demo'; reason?: string; confidence_band?: 'low' | 'med' | 'high'; risk_band?: 'low' | 'med' | 'high' }
): SlipStructureReport {
  const draftLegs = Array.isArray(input)
    ? (input as Array<SlipIntelLeg | SlipLeg>).map((leg, index) => ('leg_id' in leg ? leg as SlipLeg : toSlipLeg(leg as SlipIntelLeg, index)))
    : input.legs;

  const legs = ensureLegIds(draftLegs);

  if (legs.length === 0) {
    return {
      slip_id: context?.slip_id ?? (!Array.isArray(input) ? input.slip_id : undefined),
      trace_id: context?.trace_id,
      mode: context?.mode ?? 'demo',
      reason: context?.reason,
      confidence_band: context?.confidence_band,
      risk_band: context?.risk_band,
      weakest_leg_id: undefined,
      legs: [],
      correlation_edges: [],
      script_clusters: [],
      failure_forecast: {
        top_reasons: ['No legs yet — add props to see structure risk.']
      },
      reasons: ['No legs yet — add props to see structure risk.']
    };
  }

  const gameCounts = new Map<string, number>();
  const playerCounts = new Map<string, number>();
  let duplicatePlayerLegs = 0;
  let longshotLegs = 0;
  let altLineLegs = 0;

  for (const leg of legs) {
    const intelLeg = toIntelLeg(leg);
    const gameKey = inferGameKey(intelLeg);
    gameCounts.set(gameKey, (gameCounts.get(gameKey) ?? 0) + 1);

    const playerKey = inferPlayerKey(intelLeg);
    const nextPlayerCount = (playerCounts.get(playerKey) ?? 0) + 1;
    playerCounts.set(playerKey, nextPlayerCount);
    if (nextPlayerCount > 1) duplicatePlayerLegs += 1;

    const odds = parseAmericanOdds(typeof leg.odds === 'number' ? `${leg.odds}` : leg.odds);
    if (odds !== null && odds >= 150) longshotLegs += 1;
    if (lineLooksAlt(typeof leg.line === 'number' ? `${leg.line}` : undefined) || (odds !== null && odds >= 120)) altLineLegs += 1;
  }

  const topGameCount = Math.max(...gameCounts.values());
  const sameGameStack = topGameCount >= 4;

  const legRanked = legs.map((leg) => {
    const odds = parseAmericanOdds(typeof leg.odds === 'number' ? `${leg.odds}` : leg.odds);
    const isAggressiveLine = lineLooksAlt(typeof leg.line === 'number' ? `${leg.line}` : undefined);
    const flags: string[] = [];
    let localFragility = 20;

    if (odds !== null && odds >= 150) {
      flags.push('longshot_odds');
      localFragility += 24;
    }
    if (odds !== null && odds >= 120) {
      flags.push('plus_money');
      localFragility += 10;
    }
    if (isAggressiveLine) {
      flags.push('aggressive_line');
      localFragility += 16;
    }
    if ((playerCounts.get(leg.player ?? 'Unknown player') ?? 0) > 1) {
      flags.push('same_player_dependency');
      localFragility += 18;
    }
    if ((gameCounts.get(leg.game_id ?? 'Unlabeled game') ?? 0) > 1) {
      flags.push('same_game_script');
      localFragility += 12;
    }

    return {
      leg,
      fragility_score: clampScore(localFragility),
      flags
    };
  }).sort((a, b) => b.fragility_score - a.fragility_score)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));

  const weakest = legRanked[0];

  const correlation_edges: CorrelationEdge[] = [];
  for (let i = 0; i < legs.length; i += 1) {
    for (let j = i + 1; j < legs.length; j += 1) {
      const a = legs[i]!;
      const b = legs[j]!;
      if (a.player && b.player && a.player === b.player) {
        correlation_edges.push({ a_leg_id: a.leg_id, b_leg_id: b.leg_id, kind: 'same_player', severity: 'high', reason: 'Multiple outcomes rely on the same player.' });
      } else if (a.team && b.team && a.team === b.team) {
        correlation_edges.push({ a_leg_id: a.leg_id, b_leg_id: b.leg_id, kind: 'same_team', severity: 'med', reason: 'Multiple legs are tied to the same team result.' });
      } else if (a.game_id && b.game_id && a.game_id === b.game_id) {
        correlation_edges.push({ a_leg_id: a.leg_id, b_leg_id: b.leg_id, kind: 'same_game', severity: 'low', reason: 'Shared game script can affect both legs.' });
      }
    }
  }

  const sameGameGroups = [...gameCounts.entries()].filter(([, count]) => count >= 2);
  const script_clusters: ScriptCluster[] = sameGameGroups.map(([game, count], index) => ({
    cluster_id: `cluster_${index}_${game.replace(/\s+/g, '_').toLowerCase()}`,
    label: count >= 3 ? 'Competitive game script' : 'Shared game script',
    leg_ids: legs.filter((leg) => (leg.game_id ?? 'Unlabeled game') === game).map((leg) => leg.leg_id),
    severity: count >= 4 ? 'high' : count >= 3 ? 'med' : 'low',
    reason: `${count} legs are exposed to ${game}.`
  }));

  const reasons: string[] = [];
  if (sameGameStack) reasons.push(`${topGameCount} legs tied to one game script.`);
  if (duplicatePlayerLegs > 0) reasons.push('Multiple legs rely on repeated player outcomes.');
  if (longshotLegs > 0) reasons.push(`${longshotLegs} longshot leg${longshotLegs === 1 ? '' : 's'} increase tail risk.`);
  if (altLineLegs > 0) reasons.push(`${altLineLegs} leg${altLineLegs === 1 ? '' : 's'} use aggressive/alt-style lines.`);
  if (reasons.length === 0) reasons.push('No major concentration flags detected; risk is spread across legs.');

  const reportLegs: ReportLeg[] = legRanked.map(({ leg, fragility_score, flags, rank }) => ({
    ...leg,
    rank,
    volatility: bandFromScore(fragility_score),
    fragility_score,
    flags,
    notes_short: flags.length > 0 ? flags.join(', ') : 'No major fragility flags.'
  }));

  return {
    slip_id: context?.slip_id ?? (!Array.isArray(input) ? input.slip_id : undefined),
    trace_id: context?.trace_id,
    mode: context?.mode ?? 'demo',
    reason: context?.reason,
    confidence_band: context?.confidence_band,
    risk_band: context?.risk_band,
    weakest_leg_id: weakest?.leg.leg_id,
    legs: reportLegs,
    correlation_edges,
    script_clusters,
    failure_forecast: {
      breaker_leg_id: weakest?.leg.leg_id,
      breaker_probability_band: weakest ? bandFromScore(weakest.fragility_score) : undefined,
      top_reasons: reasons.slice(0, 3)
    },
    reasons
  };
}

export function computeSlipIntelligence(legs: SlipIntelLeg[]): SlipIntelligence {
  const report = buildSlipStructureReport(legs);
  const topGames = report.script_clusters
    .map((cluster) => ({ game: cluster.reason.replace(/^\d+ legs are exposed to /, '').replace(/\.$/, ''), count: cluster.leg_ids.length }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);

  const playerCounts = new Map<string, number>();
  report.legs.forEach((leg) => {
    const key = leg.player ?? leg.notes ?? 'Unknown player';
    playerCounts.set(key, (playerCounts.get(key) ?? 0) + 1);
  });

  const topPlayers = [...playerCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([player, count]) => ({ player, count }));

  const fragilityScore = clampScore(report.legs.reduce((sum, leg) => sum + (leg.fragility_score ?? 0), 0) / report.legs.length);
  const correlationScore = clampScore((report.correlation_edges.length / Math.max(1, report.legs.length - 1)) * 100);
  const volatilityTier: VolatilityTier = fragilityScore >= 85 ? 'Extreme' : fragilityScore >= 65 ? 'High' : fragilityScore >= 40 ? 'Med' : 'Low';

  return {
    correlationScore,
    fragilityScore,
    volatilityTier,
    sameGameStack: report.script_clusters.some((cluster) => cluster.leg_ids.length >= 4),
    exposureSummary: { topGames, topPlayers },
    weakestLegHints: report.failure_forecast.top_reasons.length > 0 ? report.failure_forecast.top_reasons : ['No major concentration flags detected; risk is spread across legs.']
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
