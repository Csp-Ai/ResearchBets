'use client';

import React from 'react';

import type { MarketType } from '../../src/core/markets/marketType';
import { Badge } from '@/src/components/ui/Badge';

export type SlipBuilderLeg = {
  id: string;
  player: string;
  marketType: MarketType;
  line: string;
  odds?: string;
  volatility?: 'low' | 'medium' | 'high';
  confidence?: number;
  game?: string;
  deadLegRisk?: 'low' | 'med' | 'high';
  deadLegReasons?: string[];
  marketImpliedProb?: number;
  consensusPrice?: string;
  recentForm?: {
    l5HitRate: number;
    l10HitRate: number;
    l5Hits: number;
    l5Games: number;
    l10Hits: number;
    l10Games: number;
    recentAverage: number;
    sampleSize: number;
    season: string;
    asOf: string;
    source: 'SportsDataIO';
  };
  adjacentAlt?: {
    line: number;
    bestPrice: string;
    consensusPrice: string;
    marketImpliedProb: number;
    sourceCount?: number;
  };
  adjacentUpperAlt?: {
    line: number;
    bestPrice: string;
    consensusPrice: string;
    marketImpliedProb: number;
    sourceCount?: number;
  };
};

export function SlipBuilder({ legs }: { legs: SlipBuilderLeg[]; onLegsChange: (legs: SlipBuilderLeg[]) => void }) {
  if (legs.length === 0) return null;

  const enrichedCount = legs.filter(
    (leg) => leg.recentForm || typeof leg.confidence === 'number' || leg.deadLegRisk || leg.volatility
  ).length;

  if (enrichedCount === 0) return null;

  return (
    <details className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold text-slate-300">
        Leg evidence details <span className="font-normal text-slate-500">({enrichedCount} enriched)</span>
      </summary>
      <div className="mt-3 space-y-2">
        {legs.map((leg) => (
          <div key={leg.id} className="border-t border-white/[0.06] pt-2 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-200">{leg.player}</p>
                <p className="text-[11px] text-slate-500">{leg.marketType.replace(/_/g, ' ')} · {leg.line}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {leg.volatility ? <Badge variant="warning" size="sm">{leg.volatility}</Badge> : null}
                {typeof leg.confidence === 'number' ? <Badge variant="info" size="sm">Estimate {Math.round(leg.confidence * 100)}%</Badge> : null}
                {leg.recentForm ? <Badge variant="info" size="sm">{leg.recentForm.l5Hits}/{leg.recentForm.l5Games} L5</Badge> : null}
                {leg.deadLegRisk ? <Badge variant={leg.deadLegRisk === 'high' ? 'danger' : leg.deadLegRisk === 'med' ? 'warning' : 'success'} size="sm" title={leg.deadLegReasons?.join(', ')}>Dead-leg {leg.deadLegRisk}</Badge> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
