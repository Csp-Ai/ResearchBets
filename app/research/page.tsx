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
  HowItWorksMini,
  LegRankList,
  RecentActivityPanel,
  SlipActionsBar,
  VerdictHero,
  type AnalyzeLeg,
  type RecentRun
} from '@/src/components/bettor/BettorFirstBlocks';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';

const DEMO_SLIP = `Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)\nLeBron James over 6.5 rebounds (-105)`;

function inferRunStatus(updatedAt: string): RecentRun['status'] {
  const updatedMs = new Date(updatedAt).getTime();
  if (Number.isFinite(updatedMs) && Date.now() - updatedMs <= 3 * 60 * 1000) return 'running';
  return 'complete';
}

function loadRecentRunsFromStorage(traceId: string): RecentRun[] {
  if (typeof window === 'undefined') return [];
  const recents = JSON.parse(window.localStorage.getItem('rb-recent-trace-ids') ?? '[]') as string[];
  const last = window.localStorage.getItem('rb-last-trace-id') ?? '';
  const deduped = Array.from(new Set([last, ...recents].filter(Boolean))).slice(0, 3);
  return deduped.map((id, index) => {
    const updatedAt = new Date(Date.now() - index * 2 * 60 * 1000).toISOString();
    return { traceId: id, updatedAt, status: inferRunStatus(updatedAt) };
  });
}

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
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
  }, []);

  useEffect(() => {
    setRecentRuns(loadRecentRunsFromStorage(traceId));
  }, [traceId]);

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

  const tryExample = () => {
    const nextTraceId = createClientRequestId();
    router.push(buildNavigationHref({ pathname: '/ingest', traceId: nextTraceId, params: { prefill: DEMO_SLIP } }));
  };

  return (
    <section className="space-y-8">
      <Surface kind="hero" className="ui-surface-card" data-testid="research-primary-hero">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold leading-tight">Analyze a bet</h1>
            <p className="text-sm text-muted">Get confidence, risk flags, and the exact leg that can break your slip.</p>
            <button type="button" className="text-sm text-link underline underline-offset-4" onClick={tryExample}>Try an example</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button intent="primary" onClick={() => setPasteOpen(true)}>Paste slip</Button>
            <Link href="/discover" className="ui-button ui-button-secondary">Build slip</Link>
          </div>
        </div>
      </Surface>

      <section className="space-y-8">
        {legs.length === 0 ? <EmptyStateBettor onPaste={() => setPasteOpen(true)} /> : (
          <>
            <VerdictHero confidence={confidence} weakestLeg={weakestLeg} reasons={reasons} />
            <SlipActionsBar onRemoveWeakest={() => weakestLeg && setLegs((current) => current.filter((leg) => leg.id !== weakestLeg.id))} onRerun={rerunResearch} canTrack />
            <Surface className="space-y-4">
              <h2 className="text-xl font-semibold">Ranked legs (weakest to strongest)</h2>
              <LegRankList legs={sortedLegs} onRemove={(id) => setLegs((current) => current.filter((leg) => leg.id !== id))} />
            </Surface>
          </>
        )}

        <RecentActivityPanel runs={recentRuns} onOpen={(recentTraceId) => router.push(`/traces/${encodeURIComponent(recentTraceId)}`)} />
        <HowItWorksMini />
      </section>

      <AdvancedDrawer developerMode={developerMode}>
        <div className="flex flex-wrap gap-2">
          <Chip>Slip ID: {slipId || 'n/a'}</Chip>
          <Chip>Trace ID: {traceId}</Chip>
        </div>
        <pre className="overflow-auto rounded bg-slate-950/80 p-2">{JSON.stringify({ legs, confidence, status }, null, 2)}</pre>
      </AdvancedDrawer>

      {pasteOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <Surface className="w-full max-w-2xl">
            <h2 className="text-lg font-semibold">Paste slip</h2>
            <textarea className="mt-3 h-56 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" value={rawSlip} onChange={(event) => setRawSlip(event.target.value)} placeholder="Paste each leg on a new line" />
            <div className="mt-3 flex gap-2">
              <Button intent="primary" onClick={() => void submitPaste()}>Analyze now</Button>
              <Button intent="secondary" onClick={() => setPasteOpen(false)}>Cancel</Button>
            </div>
          </Surface>
        </div>
      ) : null}
    </section>
  );
}

export default function ResearchPage() {
  return <Suspense fallback={null}><ResearchPageContent /></Suspense>;
}
