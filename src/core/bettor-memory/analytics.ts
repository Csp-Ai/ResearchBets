import type {
  BettorIdentity,
  BettorMemorySnapshot,
  BettorPostmortemRecord,
  ParsedSlipRecord,
  PostmortemTag,
} from './types';

export type PerformanceSummary = {
  netResult: number;
  totalStaked: number;
  totalReturned: number;
  roiPct: number;
  betCount: number;
  winCount: number;
  winRatePct: number;
  averageStake: number;
  averagePayout: number;
};

export type WeeklyRollup = { week: string; netResult: number; totalStaked: number; cumulativeNet: number };
export type CategoryPerformance = { label: string; betCount: number; winRatePct: number; roiPct: number; netResult: number };
export type HeatmapCell = { day: string; count: number; stake: number };
export type AdvisorySignal = { label: string; severity: 'low' | 'medium' | 'high'; detail: string };

const round = (value: number) => Number(value.toFixed(2));
const money = (value: number | null | undefined) => value ?? 0;
const returnedForSlip = (slip: ParsedSlipRecord) => money(slip.payout);
const stakedForSlip = (slip: ParsedSlipRecord) => money(slip.stake);
const isSettled = (slip: ParsedSlipRecord) => ['won', 'lost', 'pushed', 'cashed_out', 'partial'].includes(slip.status);
const weekKey = (value: string) => {
  const date = new Date(value);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
};

export function computePerformanceSummary(slips: ParsedSlipRecord[]): PerformanceSummary {
  const settled = slips.filter(isSettled);
  const totalStaked = settled.reduce((sum, slip) => sum + stakedForSlip(slip), 0);
  const totalReturned = settled.reduce((sum, slip) => sum + returnedForSlip(slip), 0);
  const winCount = settled.filter((slip) => slip.status === 'won').length;
  return {
    netResult: round(totalReturned - totalStaked),
    totalStaked: round(totalStaked),
    totalReturned: round(totalReturned),
    roiPct: totalStaked > 0 ? round(((totalReturned - totalStaked) / totalStaked) * 100) : 0,
    betCount: settled.length,
    winCount,
    winRatePct: settled.length > 0 ? round((winCount / settled.length) * 100) : 0,
    averageStake: settled.length > 0 ? round(totalStaked / settled.length) : 0,
    averagePayout: settled.length > 0 ? round(totalReturned / settled.length) : 0,
  };
}

export function computeWeeklyRollups(slips: ParsedSlipRecord[]): WeeklyRollup[] {
  const rows = new Map<string, { week: string; netResult: number; totalStaked: number }>();
  for (const slip of slips.filter(isSettled)) {
    const key = weekKey(slip.settled_at ?? slip.created_at);
    const row = rows.get(key) ?? { week: key, netResult: 0, totalStaked: 0 };
    row.netResult += returnedForSlip(slip) - stakedForSlip(slip);
    row.totalStaked += stakedForSlip(slip);
    rows.set(key, row);
  }
  let cumulativeNet = 0;
  return [...rows.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((row) => {
      cumulativeNet += row.netResult;
      return { week: row.week, netResult: round(row.netResult), totalStaked: round(row.totalStaked), cumulativeNet: round(cumulativeNet) };
    });
}

function aggregateCategory(slips: ParsedSlipRecord[], getKey: (slip: ParsedSlipRecord) => string): CategoryPerformance[] {
  const grouped = new Map<string, ParsedSlipRecord[]>();
  for (const slip of slips.filter(isSettled)) {
    const key = getKey(slip);
    grouped.set(key, [...(grouped.get(key) ?? []), slip]);
  }
  return [...grouped.entries()].map(([label, items]) => {
    const summary = computePerformanceSummary(items);
    return { label, betCount: items.length, winRatePct: summary.winRatePct, roiPct: summary.roiPct, netResult: summary.netResult };
  }).sort((a, b) => b.betCount - a.betCount || a.label.localeCompare(b.label));
}

export const computeMarketPerformance = (slips: ParsedSlipRecord[]) => aggregateCategory(slips, (slip) => slip.legs[0]?.normalized_market_label ?? slip.legs[0]?.market_type ?? 'Unknown');
export const computeSlipSizePerformance = (slips: ParsedSlipRecord[]) => aggregateCategory(slips, (slip) => `${slip.leg_count}-leg`);
export const computeSportsbookPerformance = (slips: ParsedSlipRecord[]) => aggregateCategory(slips, (slip) => slip.sportsbook ?? 'Unknown');

export function computeActivityHeatmap(slips: ParsedSlipRecord[]): HeatmapCell[] {
  const grouped = new Map<string, HeatmapCell>();
  for (const slip of slips) {
    const day = (slip.placed_at ?? slip.created_at).slice(0, 10);
    const current = grouped.get(day) ?? { day, count: 0, stake: 0 };
    current.count += 1;
    current.stake += stakedForSlip(slip);
    grouped.set(day, current);
  }
  return [...grouped.values()].sort((a, b) => a.day.localeCompare(b.day)).map((item) => ({ ...item, stake: round(item.stake) }));
}

export function classifyBettorIdentity(slips: ParsedSlipRecord[]): BettorIdentity {
  const settled = slips.filter(isSettled);
  const longshotShare = settled.filter((slip) => (slip.odds ?? 0) >= 400 || slip.leg_count >= 4).length / Math.max(1, settled.length);
  const averageLegs = settled.reduce((sum, slip) => sum + slip.leg_count, 0) / Math.max(1, settled.length);
  const liveShare = settled.filter((slip) => /live/i.test(slip.raw_source_reference ?? '')).length / Math.max(1, settled.length);
  if (liveShare >= 0.35) return 'live_opportunist';
  if (longshotShare >= 0.45 && averageLegs >= 3.2) return 'longshot_parlay_bettor';
  if (settled.length >= 20) return 'volume_grinder';
  if (settled.some((slip) => slip.legs.some((leg) => /alt|ladder/i.test(leg.market_type ?? '')))) return 'ladder_hunter';
  return 'selective_striker';
}

export function generateAdvisorySignals(slips: ParsedSlipRecord[]): AdvisorySignal[] {
  const settled = slips.filter(isSettled).sort((a, b) => (a.settled_at ?? a.created_at).localeCompare(b.settled_at ?? b.created_at));
  const result: AdvisorySignal[] = [];
  const stakes = settled.map((slip) => stakedForSlip(slip));
  const avgStake = stakes.reduce((sum, stake) => sum + stake, 0) / Math.max(1, stakes.length);
  const maxStake = Math.max(0, ...stakes);
  if (avgStake > 0 && maxStake >= avgStake * 2.25) result.push({ label: 'Sudden stake-size escalation', severity: 'high', detail: 'Recent sizing jumped well above the tracked average stake.' });
  const longshotCount = settled.filter((slip) => slip.leg_count >= 4 || (slip.odds ?? 0) >= 400).length;
  if (longshotCount / Math.max(1, settled.length) >= 0.4) result.push({ label: 'Longshot parlay concentration', severity: 'medium', detail: 'A large share of tracked slips rely on 4+ legs or long outright prices.' });
  const recent = settled.slice(-5);
  const losses = recent.filter((slip) => slip.status === 'lost').length;
  if (recent.length >= 4 && losses >= 4) result.push({ label: 'Cold-stretch survivability', severity: 'medium', detail: 'Recent tracked history shows a sustained loss stretch. Review stake discipline before scaling.' });
  return result;
}

export function generatePostmortemTags(slip: ParsedSlipRecord, history: ParsedSlipRecord[]): PostmortemTag[] {
  const tags = new Set<PostmortemTag>();
  const sameGame = new Set(slip.legs.map((leg) => leg.event_descriptor).filter(Boolean));
  if (sameGame.size === 1 && slip.leg_count >= 3) tags.add('correlated_same_game');
  if (slip.leg_count >= 4 || (slip.odds ?? 0) >= 400) tags.add('longshot_parlay');
  const avgStake = computePerformanceSummary(history).averageStake;
  if (avgStake > 0 && stakedForSlip(slip) >= avgStake * 2) tags.add('stake_escalation');
  const topMarket = slip.legs[0]?.normalized_market_label ?? slip.legs[0]?.market_type ?? '';
  if (slip.legs.filter((leg) => (leg.normalized_market_label ?? leg.market_type) === topMarket).length >= 3) tags.add('market_concentration');
  if (slip.legs.some((leg) => /alt|ladder/i.test(leg.market_type ?? ''))) tags.add('weak_alt_ladders');
  if (slip.legs.some((leg) => /rebound/i.test(leg.market_type ?? '')) && slip.status === 'won') tags.add('strong_rebounds');
  return [...tags];
}

export function summarizeCredibility(snapshot: BettorMemorySnapshot): BettorMemorySnapshot['credibility'] {
  if (snapshot.mode === 'demo') return { basis: 'demo_data', label: 'Demo data', detail: 'No verified bettor account is connected yet. ResearchBets is showing deterministic sample history.' };
  const verifiedArtifacts = snapshot.artifacts.filter((artifact) => artifact.verification_status === 'verified').length;
  const unverified = snapshot.artifacts.filter((artifact) => artifact.verification_status !== 'verified').length;
  if (verifiedArtifacts > 0 && unverified === 0) return { basis: 'verified_imported_history', label: 'Verified imported history', detail: 'Insights are based on saved bettor history with verified records.' };
  if (verifiedArtifacts > 0 && unverified > 0) return { basis: 'partial_data', label: 'Partial data', detail: 'Insights combine verified history with unverified screenshot parsing. Review low-confidence fields before acting.' };
  return { basis: 'unverified_screenshot_parsing', label: 'Unverified screenshot parsing', detail: 'Insights are based on screenshot parsing and require review before they should be treated as complete.' };
}

export function buildStoredPostmortems(slips: ParsedSlipRecord[]): BettorPostmortemRecord[] {
  return slips.filter((slip) => ['won', 'lost', 'partial'].includes(slip.status)).map((slip) => ({
    postmortem_id: `pm-${slip.slip_id}`,
    bettor_id: slip.bettor_id,
    slip_id: slip.slip_id,
    outcome_summary: slip.status === 'won' ? 'Slip closed as a win.' : slip.status === 'lost' ? 'Slip closed as a loss.' : 'Slip closed with a mixed or partial result.',
    weakest_leg_candidates: slip.legs.filter((leg) => leg.result === 'lost').map((leg) => leg.player_name ?? leg.team_name ?? leg.market_type ?? 'Unverified leg').slice(0, 2),
    strongest_legs: slip.legs.filter((leg) => leg.result === 'won').map((leg) => leg.player_name ?? leg.team_name ?? leg.market_type ?? 'Verified leg').slice(0, 2),
    correlated_risk_notes: generatePostmortemTags(slip, slips).includes('correlated_same_game') ? ['Multiple legs depended on the same game script.'] : [],
    market_concentration_notes: generatePostmortemTags(slip, slips).includes('market_concentration') ? ['This slip concentrated exposure in one market family.'] : [],
    slip_size_notes: slip.leg_count >= 4 ? ['4+ leg slips remain a high-variance construction.'] : ['Compact slip size limited correlation risk.'],
    confidence_score: slip.confidence_score,
    evidence: [{ basis: slip.verification_status === 'verified' ? 'verified_history' : 'unverified_parse', note: slip.verification_status === 'verified' ? 'Based on verified stored slip data.' : 'Based on parsed screenshot data that still needs review.' }],
    advisory_tags: generatePostmortemTags(slip, slips),
    created_at: slip.updated_at,
  }));
}
