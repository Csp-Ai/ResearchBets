'use client';

import React, { useState } from 'react';

import { buildPropLegInsight } from '../../src/core/slips/propInsights';
import type { MarketType } from '../../src/core/markets/marketType';
import type { SlipBuilderLeg } from '../betslip/SlipBuilder';

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

export function mapPropToLeg(player: string, prop: { market: MarketType; line: string; odds?: string }): SlipBuilderLeg {
  const insight = buildPropLegInsight({ selection: player, market: prop.market, odds: prop.odds });
  return {
    id: `${player}-${prop.market}-${prop.line}`,
    player,
    marketType: prop.market,
    line: prop.line,
    odds: prop.odds,
    volatility: insight.riskTag === 'High' ? 'high' : insight.riskTag === 'Medium' ? 'medium' : 'low',
    confidence: insight.hitRateLast5 / 100,
  };
}

export function GamesToday({ games, onAddLeg }: { games: TodayGame[]; onAddLeg: (leg: SlipBuilderLeg) => void }) {
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Today&apos;s prop board</h2>
      <p className="mt-1 text-xs text-slate-400">Click a prop chip to add to slip. Selected chips are highlighted.</p>
      <div className="mt-3 space-y-3">
        {games.map((game) => (
          <article key={game.id} className="rounded border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-xs text-cyan-300">{game.league}</p>
            <h3 className="text-sm font-medium">{game.matchup}</h3>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {game.teams.map((team) => (
                <div key={team.team}>
                  <p className="text-xs text-slate-400">{team.team}</p>
                  <ul className="mt-1 space-y-2">
                    {team.players.slice(0, 3).map((player) => (
                      <li key={player.id} className="rounded border border-slate-700 p-2">
                        <p className="text-xs font-medium">{player.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {player.props.map((prop) => {
                            const chipId = `${player.id}-${prop.market}-${prop.line}`;
                            const insight = buildPropLegInsight({ selection: player.name, market: prop.market, odds: prop.odds });
                            const active = selectedChip === chipId;
                            return (
                              <button
                                key={chipId}
                                type="button"
                                className={`rounded border px-1.5 py-0.5 text-[11px] transition ${active ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100' : 'border-slate-600 hover:border-cyan-400 hover:bg-slate-900'}`}
                                title={`Add to slip · ${player.matchupNotes} · ${player.injuryStatus} · ${insight.riskTag} volatility`}
                                onClick={() => {
                                  setSelectedChip(chipId);
                                  onAddLeg(mapPropToLeg(player.name, prop));
                                }}
                              >
                                {prop.market} {prop.line}
                              </button>
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
    </section>
  );
}
