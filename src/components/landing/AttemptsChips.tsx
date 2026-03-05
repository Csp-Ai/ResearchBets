'use client';

import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';

export function AttemptsChips({ leg }: { leg: CockpitBoardLeg }) {
  const market = leg.market.toLowerCase();
  const chips: string[] = [];

  if (market === 'threes') {
    if (typeof leg.threesAttL1 === 'number') chips.push(`3PA L1 ${leg.threesAttL1.toFixed(1)}`);
    if (typeof leg.threesAttL3Avg === 'number') chips.push(`3PA L3 ${leg.threesAttL3Avg.toFixed(1)}`);
    if (typeof leg.threesAttL5Avg === 'number') chips.push(`3PA L5 ${leg.threesAttL5Avg.toFixed(1)}`);
  }

  if (market === 'points' || market === 'pra') {
    if (typeof leg.fgaL1 === 'number') chips.push(`FGA L1 ${leg.fgaL1.toFixed(1)}`);
    if (typeof leg.fgaL3Avg === 'number') chips.push(`FGA L3 ${leg.fgaL3Avg.toFixed(1)}`);
    if (typeof leg.fgaL5Avg === 'number') chips.push(`FGA L5 ${leg.fgaL5Avg.toFixed(1)}`);
  }

  if (chips.length === 0) return null;

  return (
    <div className="attempts-chip-row" data-testid="attempts-chip-row">
      {chips.map((chip) => <span key={chip} className="board-chip attempts-chip">{chip}</span>)}
      {leg.attemptsSource ? <span className="board-chip attempts-source" title={`3PA/FGA source: ${leg.attemptsSource}`}>{`3PA: ${leg.attemptsSource}`}</span> : null}
    </div>
  );
}
