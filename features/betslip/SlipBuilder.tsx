'use client';

import React from 'react';

import { useMemo } from 'react';

import { EmptyStateCard } from '../../src/components/shared/EmptyStateCard';
import type { MarketType } from '../../src/core/markets/marketType';

export type SlipBuilderLeg = {
  id: string;
  player: string;
  marketType: MarketType;
  line: string;
  odds?: string;
  volatility?: 'low' | 'medium' | 'high';
  confidence?: number;
};

export function SlipBuilder({ legs, onLegsChange }: { legs: SlipBuilderLeg[]; onLegsChange: (legs: SlipBuilderLeg[]) => void }) {
  const totalConfidence = useMemo(() => {
    const values = legs.map((leg) => leg.confidence).filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [legs]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Slip builder</h3>
        <p className="text-xs text-slate-400">{legs.length} legs {totalConfidence !== null ? `· ${Math.round(totalConfidence * 100)}% avg confidence` : ''}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {legs.map((leg) => (
          <li key={leg.id} className="rounded border border-slate-700 bg-slate-950/60 p-2">
            <div className="flex items-center justify-between gap-2">
              <p>{leg.player} {leg.marketType} {leg.line} {leg.odds ?? ''}</p>
              <button type="button" className="rounded border border-rose-500/50 px-2 py-1 text-xs" onClick={() => onLegsChange(legs.filter((row) => row.id !== leg.id))}>Remove</button>
            </div>
            <div className="mt-1 flex gap-2 text-[11px]">
              {leg.volatility ? <span className="rounded border border-amber-500/40 px-1.5 py-0.5">Volatility: {leg.volatility}</span> : null}
              {typeof leg.confidence === 'number' ? <span className="rounded border border-cyan-500/40 px-1.5 py-0.5">Conf {Math.round(leg.confidence * 100)}%</span> : null}
            </div>
          </li>
        ))}
      </ul>
      {legs.length === 0 ? (
        <div className="mt-3">
          <EmptyStateCard
            title="No legs in draft"
            guidance="Click any prop above to add it. Legs will accumulate here."
            primaryCta={{ label: 'Browse props', href: '/dashboard' }}
          />
        </div>
      ) : null}
    </section>
  );
}
