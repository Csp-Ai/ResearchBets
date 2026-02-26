'use client';

import type { BettorDataEnvelope } from '@/src/core/bettor/gateway.server';

export default function LiveTabPanel({ data }: { data: BettorDataEnvelope | null }) {
  return (
    <div className="space-y-4">
      {data?.games.map((game) => (
        <div key={game.id} className="bettor-card p-4">
          <h3 className="text-lg font-semibold">{game.matchup}</h3>
          <p className="text-sm text-slate-300">{game.awayTeam} ({game.awayRecord}) @ {game.homeTeam} ({game.homeRecord})</p>
          <p className="mt-2 text-sm">Win likelihood: {game.homeTeam} {Math.round(game.homeWinProbability * 100)}% • {game.awayTeam} {Math.round(game.awayWinProbability * 100)}%</p>
          <ul className="mt-2 list-disc pl-4 text-sm text-slate-300">{game.matchupReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}
