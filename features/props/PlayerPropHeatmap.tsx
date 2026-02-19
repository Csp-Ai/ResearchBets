'use client';

import React from 'react';

import { asMarketType, type MarketType } from '../../src/core/markets/marketType';
import type { PlayerPropInput } from '../../src/core/slips/playerPropInput';

export type PlayerWithPropStats = {
  id: string;
  player: string;
  team: string;
  confidence?: number;
  propStats: Array<{
    marketType: PlayerPropInput['marketType'];
    line?: string;
    seasonHitRate: number;
    last5HitRate: number;
    trend?: 'up' | 'down' | 'flat';
  }>;
};

function colorForHitRate(hitRate: number): string {
  if (hitRate >= 0.65) return 'bg-emerald-500/30 text-emerald-100 border-emerald-400/60';
  if (hitRate >= 0.52) return 'bg-amber-500/20 text-amber-100 border-amber-400/50';
  return 'bg-rose-500/20 text-rose-100 border-rose-400/60';
}

function trendGlyph(trend?: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

export function normalizeHeatmapMarkets(markets: Array<PlayerPropInput['marketType']>): MarketType[] {
  return markets.map((market) => asMarketType(market, 'points'));
}

export function PlayerPropHeatmap({ players, loading = false }: { players: PlayerWithPropStats[]; loading?: boolean }) {
  const marketColumns = normalizeHeatmapMarkets(['points', 'threes', 'rebounds', 'assists', 'pra']);

  if (loading) {
    return <section className="rounded-xl border border-slate-800 bg-slate-900 p-4"><h3 className="text-lg font-semibold">Player prop heatmap</h3><div className="mt-3 h-28 animate-pulse rounded bg-slate-800/70" /></section>;
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-lg font-semibold">Player prop heatmap</h3>
      <p className="mt-1 text-xs text-slate-400">Confidence = model score vs season baseline. Percentages are recent hit rates (last 5).</p>
      <div className="mt-2 text-[11px] text-slate-500">Legend: &gt;=65% strong, 52-64% neutral, &lt;52% weak.</div>
      <div className="mt-3 grid grid-cols-[160px_repeat(5,minmax(0,1fr))] gap-2 text-xs">
        <div className="text-slate-400">Player</div>
        {marketColumns.map((market) => (
          <div key={market} className="text-slate-400 uppercase">{market}</div>
        ))}
        {players.map((player) => (
          <div key={player.id} className="contents">
            <div key={`${player.id}-name`} className="rounded border border-slate-800 bg-slate-950/50 p-2">
              <p className="font-medium">{player.player}</p>
              <p className="text-[11px] text-slate-400">{player.team}</p>
              {typeof player.confidence === 'number' ? <p className="text-[11px] text-cyan-300">Conf {Math.round(player.confidence * 100)}%</p> : null}
            </div>
            {marketColumns.map((market) => {
              const stat = player.propStats.find((item) => asMarketType(item.marketType, 'points') === market);
              const hitRate = stat?.last5HitRate ?? 0;
              return (
                <div key={`${player.id}-${market}`} className={`rounded border p-2 ${colorForHitRate(hitRate)}`}>
                  <p className="text-sm font-semibold">{Math.round(hitRate * 100)}%</p>
                  <p className="text-[11px]">Szn {Math.round((stat?.seasonHitRate ?? 0) * 100)}% {trendGlyph(stat?.trend)}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
