'use client';

import React from 'react';

import { useMemo } from 'react';

import { EmptyStateCard } from '../../src/components/shared/EmptyStateCard';
import type { MarketType } from '../../src/core/markets/marketType';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/button';

export type SlipBuilderLeg = {
  id: string;
  player: string;
  marketType: MarketType;
  line: string;
  odds?: string;
  volatility?: 'low' | 'medium' | 'high';
  confidence?: number;
  game?: string;
};

export function SlipBuilder({ legs, onLegsChange }: { legs: SlipBuilderLeg[]; onLegsChange: (legs: SlipBuilderLeg[]) => void }) {
  const totalConfidence = useMemo(() => {
    const values = legs.map((leg) => leg.confidence).filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [legs]);

  return (
    <CardSurface className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Slip builder</h3>
        <p className="text-xs text-slate-400">{legs.length} legs {totalConfidence !== null ? `· ${Math.round(totalConfidence * 100)}% avg confidence` : ''}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {legs.map((leg) => (
          <li key={leg.id} className="row-shell">
            <div className="flex items-center justify-between gap-2">
              <p>{leg.player} {leg.marketType} {leg.line} {leg.odds ?? ''}</p>
              <Button intent="ghost" className="min-h-0 px-2 py-1 text-xs" onClick={() => onLegsChange(legs.filter((row) => row.id !== leg.id))}>Remove</Button>
            </div>
            <div className="mt-1 flex gap-2 text-[11px]">
              {leg.volatility ? <Badge variant="warning" size="sm">Volatility: {leg.volatility}</Badge> : null}
              {typeof leg.confidence === 'number' ? <Badge variant="info" size="sm">Conf {Math.round(leg.confidence * 100)}%</Badge> : null}
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
    </CardSurface>
  );
}
