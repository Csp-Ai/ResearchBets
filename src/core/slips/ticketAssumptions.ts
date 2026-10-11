import type { SlipIntelLeg } from '@/src/core/slips/slipIntelligence';

/**
 * Deterministic adversarial review of a bettor's confirmed ticket.
 *
 * This module deliberately does not estimate hit rates, injury effects, team
 * assignment, expected carries or probabilities. It tests what is logically
 * knowable from the ticket and asks for missing evidence otherwise.
 */
export type TicketAssumptionFinding = {
  kind: 'contradictory_lines' | 'nested_ladders' | 'shared_backfield' | 'backfield_identity_unknown';
  evidence: 'confirmed_structure' | 'requires_verification';
  severity: 'blocker' | 'watch' | 'unknown';
  legIds: [string, string];
  title: string;
  why: string;
  countercase: string;
  toVerify: string;
  action: string;
};

export type TicketAssumptionReview = {
  primary: TicketAssumptionFinding | null;
  findings: TicketAssumptionFinding[];
  unverifiedInputs: string[];
};

type NormalizedLeg = {
  id: string;
  player: string | null;
  game: string | null;
  team: string | null;
  market: string | null;
  threshold: number | null;
  direction: 'over' | 'under' | 'unknown';
};

const normalized = (value?: string): string | null => {
  const text = value?.trim().replace(/\s+/g, ' ').toLowerCase();
  return text && text !== 'needs review' && text !== 'unknown' && text !== 'game:unlabeled'
    ? text
    : null;
};

const normalizedGame = (leg: SlipIntelLeg): string | null => {
  const id = normalized(leg.game_id ?? leg.game ?? leg.event_id ?? leg.matchup);
  return id?.replace(/\s*@\s*/g, '@') ?? null;
};

const normalizedMarket = (leg: SlipIntelLeg): string | null =>
  normalized(leg.marketType ?? leg.market);

const thresholdFrom = (leg: SlipIntelLeg): number | null => {
  // Never parse an odds price or a player's name as a threshold.
  const line = leg.line?.trim();
  if (!line) return null;
  const match = line.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
};

const directionFrom = (leg: SlipIntelLeg): NormalizedLeg['direction'] => {
  const text = `${leg.line ?? ''} ${leg.selection ?? ''}`;
  if (/\bunder\b/i.test(text)) return 'under';
  if (/\bover\b/i.test(text) || /\d(?:\.\d+)?\s*\+/.test(text)) return 'over';
  return 'unknown';
};

const prepared = (leg: SlipIntelLeg, index: number): NormalizedLeg => ({
  id: leg.id ?? `leg-${index + 1}`,
  player: normalized(leg.player),
  game: normalizedGame(leg),
  team: normalized(leg.team),
  market: normalizedMarket(leg),
  threshold: thresholdFrom(leg),
  direction: directionFrom(leg),
});

const rushingFamily = (market: string | null): boolean =>
  market === 'rushing_yards' || market === 'carries';

const severityOrder: Record<TicketAssumptionFinding['severity'], number> = {
  blocker: 0,
  watch: 1,
  unknown: 2,
};

export function reviewTicketAssumptions(legs: SlipIntelLeg[]): TicketAssumptionReview {
  const items = legs.map(prepared);
  const findings: TicketAssumptionFinding[] = [];
  const unverified = new Set<string>();

  for (const leg of items) {
    if (!leg.game) unverified.add('Matchup/event identity is missing for at least one leg.');
    if (!leg.player) unverified.add('Player identity is missing for at least one leg.');
    if (!leg.market || leg.threshold === null || leg.direction === 'unknown') {
      unverified.add('Market, threshold or direction is missing for at least one leg.');
    }
  }

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i]!;
      const b = items[j]!;
      if (!a.game || !b.game || a.game !== b.game) continue;
      const legIds: [string, string] = [a.id, b.id];

      if (a.player && a.player === b.player && a.market && a.market === b.market
          && a.threshold !== null && b.threshold !== null && a.market !== 'anytime_td') {
        const over = a.direction === 'over' ? a : b.direction === 'over' ? b : null;
        const under = a.direction === 'under' ? a : b.direction === 'under' ? b : null;
        if (over && under && over.threshold !== null && under.threshold !== null
            && over.threshold >= under.threshold) {
          findings.push({
            kind: 'contradictory_lines', evidence: 'confirmed_structure', severity: 'blocker',
            legIds, title: 'These two outcomes conflict',
            why: 'The same player and market in the same event cannot satisfy both stated directions and thresholds.',
            countercase: 'Check the original sportsbook slip: a parsing or direction error could explain the conflict.',
            toVerify: 'Confirm event, market, exact line and over/under rules.',
            action: 'Correct the ticket before treating this X-Ray as actionable.',
          });
          continue;
        }

        if (a.direction === 'over' && b.direction === 'over'
            && a.threshold !== b.threshold) {
          findings.push({
            kind: 'nested_ladders', evidence: 'confirmed_structure', severity: 'watch',
            legIds, title: 'One ladder depends on the other',
            why: 'The higher over threshold entails the lower over threshold in the same player-market-event.',
            countercase: 'Both legs can win together; this is concentrated exposure, not an impossible combination.',
            toVerify: 'Check both market rules and whether a same-market combination is permitted.',
            action: 'Do not count these as independent chances to succeed.',
          });
          continue;
        }
      }

      // No cross-player workload assertion is made when direction, market or
      // player identity cannot be established.
      if (!a.player || !b.player || a.player === b.player
          || a.direction !== 'over' || b.direction !== 'over'
          || !rushingFamily(a.market) || !rushingFamily(b.market)) continue;

      if (a.team && b.team && a.team !== b.team) continue;

      if (a.team && b.team && a.team === b.team) {
        findings.push({
          kind: 'shared_backfield', evidence: 'confirmed_structure', severity: 'watch',
          legIds, title: 'Two legs rely on the same rushing workload',
          why: 'Both players are tagged to the same team and game; each rushing over needs opportunities from that offense.',
          countercase: 'Multiple backs can clear their lines. Shared workload is not evidence of a negative correlation by itself.',
          toVerify: 'Compare expected carries, snap share, roles and potential game scripts using verified evidence.',
          action: 'Check the joint opportunity case, not only each player\'s historical hit rate.',
        });
      } else {
        findings.push({
          kind: 'backfield_identity_unknown', evidence: 'requires_verification', severity: 'unknown',
          legIds, title: 'Two rushing legs need a team and workload check',
          why: 'These rushing overs share an event, but the ticket does not establish whether the players share a backfield.',
          countercase: 'They may be on opposing teams, or both may have enough carries even if they share a team.',
          toVerify: 'Verify both teams first, then check snap share, projected carries and game-script assumptions.',
          action: 'Do not endorse their combined workload until the team and opportunity evidence is checked.',
        });
      }
    }
  }

  const unique = new Map<string, TicketAssumptionFinding>();
  for (const finding of findings) {
    const key = `${finding.kind}:${[...finding.legIds].sort().join(':')}`;
    if (!unique.has(key)) unique.set(key, finding);
  }
  const sorted = [...unique.values()].sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity]
    || a.legIds.join(':').localeCompare(b.legIds.join(':'))
  );

  return { primary: sorted[0] ?? null, findings: sorted, unverifiedInputs: [...unverified] };
}
