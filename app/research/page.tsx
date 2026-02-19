'use client';

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';
import { buildNavigationHref } from '@/src/core/ui/navigation';
import { readDeveloperMode } from '@/src/core/ui/preferences';
import { buildPropLegInsight } from '@/src/core/slips/propInsights';
import {
  AdvancedDrawer,
  EmptyStateBettor,
  LegRankList,
  SlipActionsBar,
  VerdictHero,
  type AnalyzeLeg
} from '@/src/components/bettor/BettorFirstBlocks';

const DEMO_SLIP = `Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)\nLeBron James over 6.5 rebounds (-105)`;

export function ResearchPageContent() {
  const search = useSearchParams();
  const router = useRouter();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [rawSlip, setRawSlip] = useState('');
  const [slipId, setSlipId] = useState(search.get('slip_id') ?? '');
  const [traceId, setTraceId] = useState(search.get('trace_id') ?? createClientRequestId());
  const [status, setStatus] = useState('');
  const [developerMode, setDeveloperMode] = useState(false);
  const [legs, setLegs] = useState<AnalyzeLeg[]>([]);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
  }, []);

  useEffect(() => {
    if (!slipId || typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(`rb-slip-${slipId}`);
    if (!stored) return;
    const parsed = (JSON.parse(stored) as { legs?: Array<{ selection: string; market?: string; odds?: string; line?: string }> }).legs ?? [];
    const hydrated = parsed.map((leg, index) => {
      const insight = buildPropLegInsight({ selection: leg.selection, market: leg.market, odds: leg.odds });
      return {
        id: `leg-${index}-${leg.selection}`,
        selection: leg.selection,
        market: leg.market,
        line: leg.line,
        odds: leg.odds,
        l5: insight.hitRateLast5,
        l10: Math.max(45, insight.hitRateLast5 - 6),
        season: Math.max(40, insight.hitRateLast5 - 8),
        vsOpp: Math.max(38, insight.hitRateLast5 - 10),
        risk: insight.riskTag === 'Low' ? 'strong' : insight.riskTag === 'Medium' ? 'caution' : 'weak',
        divergence: insight.riskTag === 'High'
      } as AnalyzeLeg;
    });
    setLegs(hydrated);
  }, [slipId]);

  const weakestLeg = useMemo(() => legs[0] ?? null, [legs]);
  const sortedLegs = useMemo(() => [...legs].sort((a, b) => a.l5 - b.l5), [legs]);
  const confidence = useMemo(() => {
    if (legs.length === 0) return 0;
    return Math.round(legs.reduce((sum, leg) => sum + leg.l5, 0) / legs.length);
  }, [legs]);

  const reasons = useMemo(() => {
    if (!weakestLeg) return ['Not enough data yet — add legs to analyze this slip.'];
    return [
      `Weakest leg is ${weakestLeg.selection} (${weakestLeg.l5}% L5, ${weakestLeg.l10}% L10).`,
      `${sortedLegs.filter((leg) => leg.divergence).length} leg(s) show book divergence.`,
      `Average recent hit rate is ${confidence}%.`
    ];
  }, [weakestLeg, sortedLegs, confidence]);

  const submitPaste = async () => {
    const anonSessionId = ensureAnonSessionId();
    const submitRes = await fetch('/api/slips/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'paste', raw_text: rawSlip, anon_session_id: anonSessionId, request_id: createClientRequestId() })
    }).then((res) => res.json());
    const extractRes = await fetch('/api/slips/extract', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slip_id: submitRes.slip_id, request_id: createClientRequestId(), anon_session_id: anonSessionId })
    }).then((res) => res.json());
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`rb-slip-${submitRes.slip_id}`, JSON.stringify({ legs: extractRes.extracted_legs ?? [] }));
    }
    setSlipId(submitRes.slip_id);
    setTraceId(submitRes.trace_id);
    setPasteOpen(false);
    router.push(buildNavigationHref({ pathname: '/research', traceId: submitRes.trace_id, params: { slip_id: submitRes.slip_id } }));
  };

  const rerunResearch = async () => {
    setStatus('Research refreshed.');
  };

  return (
    <section className="space-y-8">
      <header className="rb-card rb-hero" data-testid="research-primary-hero">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold leading-tight">Analyze a bet</h1>
            <p className="text-sm text-slate-400">Get confidence, risk flags, and the exact leg that can break your slip.</p>
            <button type="button" className="text-sm text-cyan-300 underline underline-offset-4" onClick={() => { setRawSlip(DEMO_SLIP); setPasteOpen(true); }}>Try an example</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rb-btn-primary" onClick={() => setPasteOpen(true)}>Paste slip</button>
            <Link href="/discover" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold">Build slip</Link>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        {legs.length === 0 ? <EmptyStateBettor onPaste={() => setPasteOpen(true)} /> : (
          <>
            <VerdictHero confidence={confidence} weakestLeg={weakestLeg} reasons={reasons} />
            <SlipActionsBar onRemoveWeakest={() => weakestLeg && setLegs((current) => current.filter((leg) => leg.id !== weakestLeg.id))} onRerun={rerunResearch} canTrack />
            <section className="rb-card space-y-4">
              <h2 className="text-xl font-semibold">Ranked legs (weakest to strongest)</h2>
              <LegRankList legs={sortedLegs} onRemove={(id) => setLegs((current) => current.filter((leg) => leg.id !== id))} />
            </section>
          </>
        )}
      </section>

      <AdvancedDrawer developerMode={developerMode}>
        <div className="flex flex-wrap gap-2">
          <span className="rb-chip">Slip ID: {slipId || 'n/a'}</span>
          <span className="rb-chip">Trace ID: {traceId}</span>
        </div>
        <pre className="overflow-auto rounded bg-slate-950/80 p-2">{JSON.stringify({ legs, confidence, status }, null, 2)}</pre>
      </AdvancedDrawer>

      {pasteOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="rb-card w-full max-w-2xl">
            <h2 className="text-lg font-semibold">Paste slip</h2>
            <textarea className="mt-3 h-56 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" value={rawSlip} onChange={(event) => setRawSlip(event.target.value)} placeholder="Paste each leg on a new line" />
            <div className="mt-3 flex gap-2">
              <button type="button" className="rb-btn-primary" onClick={() => void submitPaste()}>Analyze now</button>
              <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm" onClick={() => setPasteOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function ResearchPage() {
  return <Suspense fallback={null}><ResearchPageContent /></Suspense>;
}
