'use client';

import { Chip } from '@/src/components/ui/chip';
import type { BettorDataEnvelope } from '@/src/core/bettor/gateway.server';

export default function ScoutTabPanel({ data }: { data: BettorDataEnvelope | null }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Active players only. Suggestions are research signals, not guarantees.</p>
      {data?.games.map((game) => (
        <div key={game.id} className="bettor-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">{game.matchup}</h3>
            <Chip>{game.status === 'live' ? 'Live now' : game.startTime}</Chip>
          </div>
          <p className="mt-2 text-sm text-slate-300">Active core: {game.activePlayers.map((player) => `${player.name} (${player.role})`).join(' • ')}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {game.propSuggestions.map((prop) => (
              <div key={prop.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="font-medium">{prop.player} — {prop.market} {prop.line} ({prop.odds})</p>
                <p className="text-sm text-emerald-300">Hit {Math.round(prop.hitRateL5 * 5)}/5 recently ({Math.round(prop.hitRateL10 * 10)}/10 optional context)</p>
                <ul className="mt-2 list-disc pl-4 text-sm text-slate-300">{prop.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                <p className="mt-2 text-xs text-amber-300">Uncertainty: {prop.uncertainty}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
