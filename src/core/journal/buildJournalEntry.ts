import type { SlateSummary } from '@/src/core/slate/slateEngine';
import type { SlipTrackingState } from '@/src/core/slips/trackingTypes';

import type { JournalEntry } from './journalTypes';

function makeEntryId(slipId: string, createdAtIso: string) {
  return `journal_${slipId}_${createdAtIso.slice(0, 19).replace(/[:T-]/g, '')}`;
}

export function buildJournalEntry(tracking: SlipTrackingState, slate?: SlateSummary): JournalEntry {
  const eliminated = tracking.legs.find((leg) => leg.outcome === 'miss');
  const whatHit = tracking.legs.filter((leg) => leg.outcome === 'hit').map((leg) => `${leg.player} ${leg.market} ${leg.line}`);
  const whatMissed = tracking.legs.filter((leg) => leg.outcome === 'miss').map((leg) => `${leg.player} ${leg.market} ${leg.line}`);
  const runbackCandidates = tracking.legs
    .filter((leg) => leg.outcome === 'hit' && leg.convictionAtBuild && leg.convictionAtBuild >= 70 && (leg.volatility === 'low' || leg.volatility === 'medium'))
    .map((leg) => `${leg.player} ${leg.market} ${leg.line}`);

  const notes = [
    ...(tracking.summary?.learningHighlights ?? []),
    ...tracking.legs
      .filter((leg) => leg.outcome === 'miss' && (leg.missType === 'variance' || leg.missType === 'unknown'))
      .map((leg) => `${leg.player}: variance/unknown miss. Do not auto-blacklist; require sample size.`)
  ];

  return {
    entryId: makeEntryId(tracking.slipId, new Date().toISOString()),
    slipId: tracking.slipId,
    createdAtIso: new Date().toISOString(),
    status: tracking.status,
    eliminatedByLegId: eliminated?.legId,
    slateNarrative: slate?.narrative,
    leadsUsed: tracking.legs.map((leg) => ({
      legId: leg.legId,
      conviction: leg.convictionAtBuild ?? 55,
      volatility: leg.volatility
    })),
    whatHit,
    whatMissed,
    runbackCandidates,
    notes
  };
}
