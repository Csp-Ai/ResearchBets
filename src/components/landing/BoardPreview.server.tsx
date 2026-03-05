import Link from 'next/link';

import { FEATURED_STAT_CATEGORY_ORDER, FEATURED_STAT_LABEL, mapMarketToFeaturedStatCategory } from '@/src/core/markets/statCategory';
import { buildCanonicalBoard } from '@/src/core/today/boardModel';
import { resolveTodayTruth } from '@/src/core/today/service.server';

const chip = (v?: string) => v ?? 'heuristic';

export async function BoardPreviewServer({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sport = typeof searchParams?.sport === 'string' ? searchParams.sport.toUpperCase() as 'NBA' : 'NBA';
  const tz = typeof searchParams?.tz === 'string' ? searchParams.tz : 'UTC';
  const date = typeof searchParams?.date === 'string' ? searchParams.date : new Date().toISOString().slice(0, 10);
  const mode = searchParams?.mode === 'demo' ? 'demo' : 'live';
  const payload = await resolveTodayTruth({ sport, tz, date, mode });

  const gameIds = payload.games.slice(0, 2).map((g) => g.id);
  const rows = buildCanonicalBoard(payload).filter((r) => gameIds.includes(r.gameId));

  const q = new URLSearchParams({ sport, tz, date, mode });

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Board Preview</h2>
        <span className="text-xs text-slate-300">{payload.mode}</span>
      </div>
      {FEATURED_STAT_CATEGORY_ORDER.map((category) => {
        const bucketRows = rows.filter((r) => mapMarketToFeaturedStatCategory(r.market) === category).slice(0, 4);
        return (
          <div key={category} className="mb-2">
            <p className="text-xs text-cyan-200">{FEATURED_STAT_LABEL[category]}</p>
            <ul className="space-y-1">
              {bucketRows.map((row) => (
                <li key={row.id} className="rounded border border-white/10 px-2 py-1 text-xs text-slate-200">
                  {row.player} {row.line} · MIN L3 {row.minutesL3Avg?.toFixed(1) ?? '—'} ({chip(row.minutesSource)}) · L5 {row.l5Avg?.toFixed(1) ?? '—'} ({chip(row.l5Source)})
                  {row.market === 'threes' ? ` · 3PA L5 ${row.threesAttL5Avg?.toFixed(1) ?? '—'} (${chip(row.attemptsSource)})` : ''}
                  {row.deadLegRisk ? ` · Dead-leg ${row.deadLegRisk}: ${row.deadLegReasons?.[0] ?? 'Role volatility'}` : ''}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="mt-3 flex gap-2 text-xs">
        <Link href={`/today?${q.toString()}`} className="rounded border border-cyan-300/60 px-2 py-1 text-cyan-200">Build from Board</Link>
        <Link href={`/ingest?${q.toString()}`} className="rounded border border-white/20 px-2 py-1 text-slate-200">Paste slip</Link>
      </div>
    </section>
  );
}
