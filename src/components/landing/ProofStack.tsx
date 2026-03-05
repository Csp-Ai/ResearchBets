'use client';

import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { BoardFragilityPreview } from '@/src/components/landing/BoardFragilityPreview';
import { HeroProofCard } from '@/src/components/landing/HeroProofCard';
import type { ResearchProvenance } from '@/src/core/run/researchRunDTO';
import type { SlipBuilderLeg } from '@/features/betslip/SlipBuilder';

type ProofStackProps = {
  board: CockpitBoardLeg[];
  slip: SlipBuilderLeg[];
  feedsOk: boolean;
  logMode: 'live' | 'cached' | 'heuristic';
  reasons: string[];
  runProvenance?: ResearchProvenance;
};

export function ProofStack({ board, slip, feedsOk, logMode, reasons, runProvenance }: ProofStackProps) {
  return (
    <div className="proof-stack" data-testid="proof-stack">
      {board.length > 0 ? <BoardFragilityPreview rows={board} /> : null}
      <HeroProofCard
        slip={slip}
        board={board}
        feedsOk={feedsOk}
        logMode={logMode}
        reasons={reasons}
        runProvenance={runProvenance}
      />
    </div>
  );
}
