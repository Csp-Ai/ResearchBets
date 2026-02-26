import React from 'react';
import Link from 'next/link';

import { fallbackToday } from '@/src/core/today/fallback';
import { ModeBadge } from '@/src/components/landing/ModeBadge';
import { appendQuery } from '@/src/components/landing/navigation';
import { toHref } from '@/src/core/nervous/routes';
import { DEFAULT_SPINE, type QuerySpine } from '@/src/core/nervous/spine';

type BoardPreviewSSRProps = {
  spine: QuerySpine;
};

export function BoardPreviewSSR({ spine }: BoardPreviewSSRProps) {
  const today = fallbackToday(spine);
  const game = today.games[0];
  const props = today.board.filter((item) => item.gameId === game?.id).slice(0, 3);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4" aria-label="board-preview-ssr">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100">Tonight&apos;s Board preview</h2>
        <ModeBadge mode={today.mode} reason={today.reason} />
      </div>
      <p className="text-sm text-slate-300">{game?.matchup ?? 'Featured matchup'} · {game?.startTime ?? 'Tonight'}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-200">
        {(props.length ? props : today.board.slice(0, 3)).map((prop) => (
          <li key={prop.id} className="rounded-lg border border-white/10 px-3 py-2">
            {prop.player} · {prop.market} {prop.line} <span className="text-slate-400">({prop.odds})</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={toHref('/today', spine)} className="rounded-md bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950">Open full board</Link>
        <Link href={appendQuery(toHref('/slip', spine), { sample: '1' })} className="rounded-md border border-white/15 px-3 py-2 text-xs text-slate-200">Try sample slip</Link>
      </div>
    </section>
  );
}

export function getLandingSpineFromSearch(searchParams?: Record<string, string | string[] | undefined>): QuerySpine {
  const read = (key: keyof QuerySpine) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    sport: read('sport') ?? DEFAULT_SPINE.sport,
    tz: read('tz') ?? DEFAULT_SPINE.tz,
    date: read('date') ?? DEFAULT_SPINE.date,
    mode: read('mode') === 'live' ? 'live' : 'demo',
    trace_id: read('trace_id') ?? DEFAULT_SPINE.trace_id,
  };
}
