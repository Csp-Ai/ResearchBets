'use client';

import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';

import { pickMostFragileProp } from '@/src/components/landing/boardFragility';

type BoardFragilityPreviewProps = {
  rows: readonly CockpitBoardLeg[];
  className?: string;
};

const toLevel = (fragility: number) => {
  if (fragility >= 0.7) return 'High';
  if (fragility >= 0.4) return 'Med';
  return 'Low';
};

export function BoardFragilityPreview({ rows, className }: BoardFragilityPreviewProps) {
  const pick = pickMostFragileProp(rows);
  if (!pick || pick.fragility === 0) return null;

  const marketParts = [pick.market, pick.line].filter(Boolean).join(' ');
  const detailLine = [marketParts, pick.odds ? `(${pick.odds})` : undefined].filter(Boolean).join(' ');

  return (
    <aside
      className={['hero-proof-card', 'hero-fragility-card', className].filter(Boolean).join(' ')}
      data-testid="board-fragility-preview"
      aria-live="polite"
    >
      <p className="hero-proof-eyebrow">Tonight&apos;s Most Fragile Prop</p>
      <h2>{pick.player}</h2>
      {detailLine ? <p>{detailLine}</p> : null}
      <p className="hero-proof-sub">Fragility: {toLevel(pick.fragility)} ({pick.fragility.toFixed(2)})</p>
      {pick.reasons.length > 0 ? (
        <ul>
          {pick.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      ) : null}
      <p className="hero-proof-evidence">{pick.evidence}</p>
    </aside>
  );
}
