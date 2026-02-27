'use client';

import { getModePresentation } from '@/src/core/mode';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { buildSlateSummary } from '@/src/core/slate/slateEngine';
import { generateRankedLeads, type BoardProp } from '@/src/core/slate/leadEngine';
import { parseTodayEnvelope } from '@/src/core/today/todayApiAdapter';
import type { TodayPayload } from '@/src/core/today/types';

const EMPTY_TODAY: TodayPayload = {
  mode: 'demo',
  reason: 'provider_unavailable',
  generatedAt: new Date(0).toISOString(),
  leagues: [],
  games: [],
  board: [],
  status: 'market_closed'
};

function asBoardProps(payload: TodayPayload): BoardProp[] {
  return payload.games.flatMap((game, gameIndex) => game.propsPreview.map((prop, propIndex) => ({
    id: prop.id,
    player: prop.player,
    market: prop.market,
    line: prop.line ?? 'N/A',
    odds: prop.odds ?? '-110',
    hitRateL10: prop.hitRateL10 ?? (56 + ((gameIndex + propIndex) % 20)),
    riskTag: prop.riskTag ?? (((gameIndex + propIndex) % 3 === 0) ? 'watch' : 'stable'),
    gameId: game.id
  })));
}

export function TonightPreviewPanel() {
  const nervous = useNervousSystem();
  const [today, setToday] = useState<TodayPayload>(EMPTY_TODAY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const href = appendQuery('/api/today', { sport: nervous.sport, tz: nervous.tz, date: nervous.date, trace_id: nervous.trace_id });
      try {
        const response = await fetch(href, { cache: 'no-store', signal: controller.signal });
        const payload = response.ok ? await response.json() : null;
        const parsedEnvelope = parseTodayEnvelope(payload);
        const candidate = parsedEnvelope.success && parsedEnvelope.data.ok ? parsedEnvelope.data.data : payload;
        setToday((candidate ?? EMPTY_TODAY) as TodayPayload);
      } catch {
        setToday(EMPTY_TODAY);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [nervous.date, nervous.sport, nervous.tz, nervous.trace_id]);

  const slate = useMemo(() => buildSlateSummary(today), [today]);
  const leads = useMemo(() => generateRankedLeads(asBoardProps(today), slate, {
    maxLeads: 5,
    diversifyAcrossGames: true,
    maxPerGame: 2,
    minConviction: 65,
    allowHighVolatility: false,
    reactivePenaltyMultiplier: 1.2
  }), [slate, today]);

  const modeLabel = getModePresentation(today.mode).label;

  return (
    <section className="group relative overflow-hidden rounded-2xl border border-cyan-300/30 bg-slate-950/70 p-[1px] shadow-[0_0_60px_-35px_rgba(34,211,238,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_75px_-30px_rgba(34,211,238,0.7)]">
      <div className="absolute inset-0 -z-10 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(34,211,238,0.35),rgba(16,185,129,0.2),rgba(56,189,248,0.35),rgba(34,211,238,0.35))] opacity-80" />
      <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/90">Know where to look tonight.</p>
            <h2 className="text-lg font-semibold text-white">Tonight&apos;s Slate Read + Leads</h2>
          </div>
          <span className="rounded-full border border-white/20 px-2.5 py-1 text-xs text-slate-200">{modeLabel}</span>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="h-4 w-5/6 rounded bg-white/10" />
            <div className="h-14 rounded-lg bg-white/10" />
            <div className="h-14 rounded-lg bg-white/10" />
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-200">{slate.narrative.split('. ').slice(0, 2).join('. ')}.</p>
            <ul className="mt-3 space-y-2">
              {leads.slice(0, 5).map((lead) => (
                <li key={lead.prop.id} className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2">
                  <p className="text-sm text-white">{lead.prop.player} · {lead.prop.market} {lead.prop.line}</p>
                  <p className="text-xs text-slate-300">Conviction {lead.convictionScore} · {lead.scriptFit} script fit · {lead.volatility} volatility</p>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={appendQuery('/tonight', { sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode, trace_id: nervous.trace_id })} className="rounded-xl border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-950">Open Tonight</Link>
          <Link href={appendQuery('/ingest', { sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode, trace_id: nervous.trace_id })} className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-slate-100">Ingest Slip</Link>
        </div>
        <p className="mt-2 text-xs text-slate-400">We surface high-probability leads; you confirm price on your book.</p>
      </div>
    </section>
  );
}
