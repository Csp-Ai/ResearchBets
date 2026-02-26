import Link from 'next/link';

import { appendQuery } from '@/src/components/landing/navigation';
import { deterministicPropReasoning } from '@/src/core/agents/propReasoning';
import { rankPropRecommendations, type PropScoutInputRow } from '@/src/core/agents/propScout.server';
import { formatPct, formatSignedPct } from '@/src/core/markets/edgePrimitives';
import { getTodayPayload } from '@/src/core/today/service.server';

export default async function GameDetailPage({ params }: { params: { gameId: string } }) {
  const payload = await getTodayPayload({ sport: 'NBA' });
  const game = payload.games.find((entry) => entry.id === params.gameId) ?? payload.games[0];

  if (!game) {
    return <section className="mx-auto max-w-4xl p-6 text-sm text-slate-300">No NBA games available right now. Check back closer to lock.</section>;
  }

  const activePlayers = Array.from(new Set(game.propsPreview.map((prop) => prop.player)));
  const boardRows: PropScoutInputRow[] = game.propsPreview.map((prop) => {
    const l10Raw = (prop.hitRateL10 ?? 55) / 100;
    const edgeDelta = Number.isFinite(prop.edgeDelta) ? prop.edgeDelta ?? 0 : 0;
    const volatility = prop.riskTag === 'stable' ? 'low' : 'high';

    return {
      id: prop.id,
      gameId: game.id,
      player: prop.player,
      market: prop.market,
      line: prop.line,
      odds: prop.odds,
      marketImpliedProb: prop.marketImpliedProb ?? 0.5,
      modelProb: prop.modelProb ?? 0.5,
      edgeDelta,
      l5: prop.hitRateL5 ?? Math.max(0.35, Math.min(0.8, l10Raw - 0.08)),
      l10: l10Raw,
      volatility,
      riskTag: prop.riskTag ?? 'watch',
      reasoning: deterministicPropReasoning({ player: prop.player, market: prop.market, l10: l10Raw, edgeDelta, volatility }),
      book_source: prop.book_source,
      line_variance: prop.line_variance,
      book_count: prop.book_count,
    };
  });

  const recommendations = rankPropRecommendations(boardRows, { topN: 5 });

  return (
    <section className="mx-auto max-w-5xl space-y-4 p-4 pb-20">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-400">{payload.mode} mode</p>
        <h1 className="text-2xl font-semibold text-slate-100">{game.matchup}</h1>
        <p className="text-sm text-slate-300">{game.startTime} · Active players: {activePlayers.length}</p>
      </header>

      <article className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Active Players</h2>
        <p className="mt-2 text-sm text-slate-300">{activePlayers.length > 0 ? activePlayers.join(' · ') : 'No active players yet. We will refresh as props populate.'}</p>
      </article>

      <article className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Top player prop recommendations</h2>
        <div className="mt-3 space-y-3">
          {recommendations.map((prop) => (
            <div key={prop.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-100">{prop.player} · {prop.market} {prop.line ?? 'TBD'}</p>
                <p className="text-lg font-semibold text-cyan-200">{formatSignedPct(Number.isFinite(prop.edgeDelta) ? prop.edgeDelta : 0)}</p>
              </div>
              <p className="mt-1 text-xs text-slate-300">Model {formatPct(prop.modelProb)} · Market {formatPct(prop.marketImpliedProb)} · L5 {((prop.l5 ?? 0.5) * 100).toFixed(0)}% · L10 {(prop.l10 * 100).toFixed(0)}% · Volatility {prop.volatility}</p>
              <p className="mt-1 text-xs text-slate-400">{prop.reasoning}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link className="rounded border border-cyan-500/50 px-2 py-1 text-xs text-cyan-100" href={appendQuery('/slip', { seedPlayer: prop.player, seedMarket: prop.market, seedLine: prop.line ?? '0.5', seedOdds: prop.odds, gameId: game.id, propId: prop.id })}>Add to slip</Link>
                <Link className="rounded border border-white/20 px-2 py-1 text-xs text-slate-200" href={appendQuery('/slip', { seedPlayer: prop.player, seedMarket: prop.market, seedLine: prop.line ?? '0.5', gameId: game.id, run: '1' })}>Run research</Link>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
