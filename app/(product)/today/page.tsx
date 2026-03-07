import { headers } from 'next/headers';

import { TodayPageClient } from '@/src/components/today/TodayPageClient';
import { normalizeSpine } from '@/src/core/nervous/spine';
import { toHref } from '@/src/core/nervous/routes';
import { createDemoTodayPayload } from '@/src/core/today/demoToday';
import type { TodayPayload } from '@/src/core/today/types';
import { buildTodayRuntimeSummary } from '@/src/core/ui/truthPresentation';

type TodayPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const readFirst = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function NextGamesFastPaint({ payload }: { payload: TodayPayload }) {
  const games = payload.games.slice(0, 2);
  const runtime = buildTodayRuntimeSummary({
    mode: payload.mode,
    reason: payload.provenance?.reason ?? payload.reason,
    degradedReason: payload.provenance?.reason,
    generatedAt: payload.generatedAt
  });
  return (
    <section className="panel-shell p-3" aria-label="Next games fast paint">
      <div className="flex items-center justify-between gap-2 text-xs">
        <p className="font-semibold text-slate-100">Next 2 games</p>
        <span className="mono-number text-slate-300">{runtime.modeLabel} · {runtime.sourceLabel.replace('Source quality: ', '')}</span>
      </div>
      <p className="mt-1 text-xs text-slate-400" title={runtime.bannerDetail}>Status: {runtime.bannerDetail}</p>
      {games.length === 0 ? <p className="mt-2 text-xs text-slate-400">No upcoming games in this window.</p> : (
        <ul className="mt-2 space-y-2 text-sm">
          {games.map((game) => (
            <li key={game.id} className="row-shell">
              <p className="font-semibold text-slate-100">{game.matchup}</p>
              <p className="text-xs text-slate-400">{game.startTime} · {game.status}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const spine = normalizeSpine({
    sport: readFirst(searchParams?.sport),
    date: readFirst(searchParams?.date),
    tz: readFirst(searchParams?.tz),
    mode: readFirst(searchParams?.mode),
    trace_id: readFirst(searchParams?.trace_id),
    tab: readFirst(searchParams?.tab)
  });

  let initialPayload = createDemoTodayPayload();

  try {
    const incomingHeaders = await headers();
    const requestHeaders = new Headers();
    for (const [key, value] of incomingHeaders.entries()) {
      if (key.toLowerCase() === 'cookie' || key.toLowerCase() === 'authorization') {
        requestHeaders.set(key, value);
      }
    }

    const host = incomingHeaders.get('x-forwarded-host') ?? incomingHeaders.get('host') ?? 'localhost:3000';
    const proto = incomingHeaders.get('x-forwarded-proto') ?? 'http';
    const response = await fetch(`${proto}://${host}${toHref('/api/today', spine)}`, {
      cache: 'no-store',
      headers: requestHeaders
    });

    if (response.ok) {
      const payload = await response.json() as { ok?: boolean; data?: TodayPayload };
      if (payload.ok && payload.data) initialPayload = payload.data;
    }
  } catch {
    initialPayload = createDemoTodayPayload();
  }

  return (
    <div className="space-y-3">
      <NextGamesFastPaint payload={initialPayload} />
      <TodayPageClient initialPayload={initialPayload} />
    </div>
  );
}
