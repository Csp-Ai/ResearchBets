'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { deriveRunHeader } from '@/src/core/ui/deriveTruth';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { buildSlateSummary } from '@/src/core/slate/slateEngine';
import { detectReactiveWindow } from '@/src/core/slate/reactiveWindow';
import { generateRankedLeads, type BoardProp } from '@/src/core/slate/leadEngine';
import type { TodayPayload } from '@/src/core/today/types';

function boardProps(payload: TodayPayload): BoardProp[] {
  return payload.games.flatMap((game, gameIndex) => game.propsPreview.map((prop, propIndex) => ({
    id: prop.id,
    player: prop.player,
    market: prop.market,
    line: prop.line ?? '0.5',
    odds: prop.odds ?? '-110',
    hitRateL10: prop.hitRateL10 ?? (56 + ((gameIndex + propIndex) % 20)),
    riskTag: prop.riskTag ?? (((gameIndex + propIndex) % 3 === 0) ? 'watch' : 'stable'),
    gameId: game.id
  })));
}

export default function DiscoverPageClient() {
  const nervous = useNervousSystem();
  const draft = useDraftSlip();
  const [payload, setPayload] = useState<TodayPayload | null>(null);

  useEffect(() => {
    fetch(nervous.toHref('/api/today'), { cache: 'no-store' })
      .then((response) => response.json() as Promise<{ ok?: boolean; data?: TodayPayload }>)
      .then((json) => setPayload(json.ok ? (json.data ?? null) : null))
      .catch(() => setPayload(null));
  }, [nervous]);

  const leads = useMemo(() => {
    if (!payload) return [];
    const slate = buildSlateSummary(payload);
    const reactive = detectReactiveWindow(payload);
    return generateRankedLeads(boardProps(payload), slate, {
      maxLeads: 8,
      diversifyAcrossGames: true,
      maxPerGame: 2,
      reactive: { isReactive: reactive.isReactive }
    }).slice(0, 8);
  }, [payload]);

  const run = deriveRunHeader({
    trace_id: nervous.trace_id,
    mode: payload?.mode,
    reason: payload?.reason,
    generatedAt: payload?.generatedAt
  });

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs text-slate-400">{run.modeLabel}</p>
      <h2 className="text-xl font-semibold">Top Leads (Diversified)</h2>
      <div className="grid gap-2 md:grid-cols-2">
        {leads.slice(0, 6).map((lead) => (
          <article key={lead.prop.id} className="rounded border border-white/10 p-3 text-sm">
            <p className="font-medium">{lead.prop.player} · {lead.prop.market} {lead.prop.line}</p>
            <p className="text-xs text-slate-300">Conviction {lead.convictionScore} · {lead.volatility}</p>
            <button
              type="button"
              className="mt-2 rounded border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs"
              onClick={() => draft.addLeg({ id: lead.prop.id, player: lead.prop.player, marketType: lead.prop.market, line: lead.prop.line, odds: lead.prop.odds, game: lead.prop.gameId })}
            >
              Quick-add
            </button>
          </article>
        ))}
      </div>

      <div className="rounded border border-white/10 p-3">
        <h3 className="text-sm font-semibold">Injuries Watch</h3>
        <p className="mt-1 text-xs text-slate-300">No trusted injury alerts in this window.</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded bg-cyan-400 px-3 py-2 font-semibold text-slate-950" href={appendQuery(nervous.toHref('/track'), draft.slip.length > 0 ? { source: 'discover' } : {})}>Track slip</Link>
        <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/stress-test'), { source: 'discover' })}>Stress-test</Link>
        <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/tonight'), { source: 'discover' })}>Open Tonight</Link>
      </div>
    </section>
  );
}
