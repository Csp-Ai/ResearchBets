'use client';

import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import type { ResearchProvenance } from '@/src/core/run/researchRunDTO';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

type HeroProofCardProps = {
  slip: SlipBuilderLeg[];
  board: CockpitBoardLeg[];
  feedsOk: boolean;
  logMode: 'live' | 'cached' | 'heuristic';
  reasons?: string[];
  runProvenance?: ResearchProvenance;
};

const example = {
  weakest: 'Shooter 3PM O2.5',
  why: 'Attempts trend dipped over the last three games.',
  tryLine: 'Try swapping to PTS O19.5 for steadier volume.'
};

export function HeroProofCard({ slip, board, reasons, feedsOk, logMode }: HeroProofCardProps) {
  const report = buildSlipStructureReport(slip.map((leg) => ({
    id: leg.id,
    player: leg.player,
    market: leg.marketType,
    line: leg.line,
    odds: leg.odds,
    game: leg.game
  })));
  const weakest = report.legs.find((leg) => leg.leg_id === report.weakest_leg_id);
  const boardWeakest = board.find((row) => row.id === weakest?.leg_id);

  const detailReasons = (reasons && reasons.length > 0 ? reasons : report.reasons).slice(0, 2);

  return (
    <aside className="hero-proof-card" data-testid="hero-proof-card" aria-live="polite">
      {slip.length > 0 ? (
        <>
          <p className="hero-proof-eyebrow">Weakest leg (right now)</p>
          <h2>{weakest ? `${weakest.player} · ${weakest.market} ${weakest.line}` : 'Add 2–4 legs to isolate pressure.'}</h2>
          {detailReasons.length > 0 ? (
            <ul>
              {detailReasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          ) : (
            <p>Add 2–4 legs to isolate pressure.</p>
          )}
          {boardWeakest?.matchup ? <p className="hero-proof-sub">Context: {boardWeakest.matchup}</p> : null}
        </>
      ) : (
        <>
          <p className="hero-proof-eyebrow">Example diagnosis</p>
          <h2>Weakest leg: {example.weakest}</h2>
          <p>Why: {example.why}</p>
          <p>Try: {example.tryLine}</p>
        </>
      )}
      <p className="hero-proof-evidence">Evidence: odds feed {feedsOk ? 'OK' : 'degraded'} · logs: {logMode}</p>
    </aside>
  );
}
