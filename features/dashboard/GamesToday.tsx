'use client';

import React, { useState } from 'react';

import { buildPropLegInsight } from '../../src/core/slips/propInsights';
import type { MarketType } from '../../src/core/markets/marketType';
import type { SlipBuilderLeg } from '../betslip/SlipBuilder';
import { CardSurface } from '@/src/components/ui/CardSurface';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/button';

export type TodayGame = {
  id: string;
  league: 'NBA' | 'NFL';
  matchup: string;
  teams: Array<{
    team: string;
    players: Array<{
      id: string;
      name: string;
      injuryStatus: string;
      matchupNotes: string;
      props: Array<{ market: MarketType; line: string; odds?: string }>;
    }>;
  }>;
};

export function mapPropToLeg(player: string, prop: { market: MarketType; line: string; odds?: string }, game?: string): SlipBuilderLeg {
  const insight = buildPropLegInsight({ selection: player, market: prop.market, odds: prop.odds });
  return {
    id: `${player}-${prop.market}-${prop.line}`,
    player,
    marketType: prop.market,
    line: prop.line,
    odds: prop.odds,
    volatility: insight.riskTag === 'High' ? 'high' : insight.riskTag === 'Medium' ? 'medium' : 'low',
    confidence: insight.hitRateLast5 / 100,
    game
  };
}

export function GamesToday({ games, onAddLeg }: { games: TodayGame[]; onAddLeg: (leg: SlipBuilderLeg) => void }) {
  const [selectedChips, setSelectedChips] = useState<Set<string>>(() => new Set());

  return (
    <CardSurface className="p-4">
      <h2 className="text-lg font-semibold">Today&apos;s prop board</h2>
      <p className="mt-1 text-xs text-slate-400">Click a market to add to slip.</p>
      <div className="mt-3 space-y-3">
        {games.map((game) => (
          <article key={game.id} className="row-shell p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{game.matchup}</h3>
              <Badge size="sm" variant="info">{game.league}</Badge>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {game.teams.map((team) => (
                <div key={team.team}>
                  <p className="text-xs text-slate-400">{team.team}</p>
                  <ul className="mt-1 space-y-1.5">
                    {team.players.slice(0, 3).map((player) => (
                      <li key={player.id} className="rounded-md border border-slate-700/80 bg-slate-900/50 p-2">
                        <p className="text-xs font-medium">{player.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {player.props.map((prop) => {
                            const chipId = `${player.id}-${prop.market}-${prop.line}`;
                            const insight = buildPropLegInsight({ selection: player.name, market: prop.market, odds: prop.odds });
                            const active = selectedChips.has(chipId);
                            return (
                              <Button
                                key={chipId}
                                intent={active ? 'primary' : 'ghost'}
                                className="min-h-0 px-2 py-1 text-[11px]"
                                title={`Add to slip · ${player.matchupNotes} · ${player.injuryStatus} · ${insight.riskTag} volatility`}
                                onClick={() => {
                                  setSelectedChips((prev) => {
                                    const next = new Set(prev);
                                    next.add(chipId);
                                    return next;
                                  });
                                  onAddLeg(mapPropToLeg(player.name, prop, game.matchup));
                                }}
                              >
                                {prop.market} {prop.line}
                              </Button>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </CardSurface>
  );
}
