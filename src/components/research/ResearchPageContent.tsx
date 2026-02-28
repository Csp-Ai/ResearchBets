'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

import { computeLegRisk, runSlip } from '@/src/core/pipeline/runSlip';
import { getLatestTraceId, runStore } from '@/src/core/run/store';
import type { Run } from '@/src/core/run/types';
import type { ResearchReport } from '@/src/core/evidence/evidenceSchema';
import { mergeSnapshotHighlights, toResearchRunDTOFromRun, validateResearchRunDTO } from '@/src/core/run/researchRunDTO';
import { LIVE_MODE_EVENT, readCoverageAgentEnabled, readDeveloperMode, readLiveModeEnabled } from '@/src/core/ui/preferences';
import type { BettorDataEnvelope } from '@/src/core/bettor/gateway.server';
import {
  type AnalyzeLeg,
  type RecentRun,
  type RecentRunDemo
} from '@/src/components/bettor/BettorFirstBlocks';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';
import { getQueryTraceId, withTraceId } from '@/src/core/trace/queryTrace';
import { buildShareRunHref } from '@/src/core/trace/shareHref';
import { RunStatusPill } from '@/src/components/trace/RunStatusPill';
import { TruthSpineHeader } from '@/src/components/ui/TruthSpineHeader';

const ScoutTabPanel = dynamic(() => import('@/src/components/research/ScoutTabPanel'), {
  loading: () => <Surface className="h-48 animate-pulse bg-slate-900/60" />
});

const LiveTabPanel = dynamic(() => import('@/src/components/research/LiveTabPanel'), {
  loading: () => <Surface className="h-40 animate-pulse bg-slate-900/60" />
});

const AnalyzeTabPanel = dynamic(() => import('@/src/components/research/AnalyzeTabPanel'), {
  loading: () => <Surface className="h-56 animate-pulse bg-slate-900/60" />
});

const RecentActivityPanel = dynamic(
  () => import('@/src/components/bettor/BettorFirstBlocks').then((m) => m.RecentActivityPanel),
  { loading: () => <Surface className="h-28 animate-pulse bg-slate-900/60" /> }
);

const HowItWorksMini = dynamic(
  () => import('@/src/components/bettor/BettorFirstBlocks').then((m) => m.HowItWorksMini),
  { loading: () => <Surface className="h-20 animate-pulse bg-slate-900/60" /> }
);

const AdvancedDrawer = dynamic(
  () => import('@/src/components/bettor/BettorFirstBlocks').then((m) => m.AdvancedDrawer),
  { ssr: false }
);

const DEMO_SLIP = `Jayson Tatum over 29.5 points (-110)
Luka Doncic over 8.5 assists (-120)
LeBron James over 6.5 rebounds (-105)`;

const toRecentStatus = (run: Run): RecentRun['status'] => (run.status === 'complete' ? 'complete' : 'running');
const tabs = ['analyze', 'scout', 'live'] as const;

const toDeterministicDemoRun = ({
  sport,
  tz,
  date,
  mode,
  stressTestHref,
  ingestHref,
  boardHref
}: {
  sport: string;
  tz: string;
  date: string;
  mode: string;
  stressTestHref: string;
  ingestHref: string;
  boardHref: string;
}): RecentRunDemo => {
  const deterministicLegs = DEMO_SLIP.split('\n').filter(Boolean);
  return {
    traceId: 'demo-trace',
    steps: ['Scout', 'Risk', 'Notes'],
    weakestLeg: deterministicLegs[2] ?? deterministicLegs[0] ?? 'LeBron James over 6.5 rebounds (-105)',
    generatedAt: new Date().toISOString(),
    ctas: [
      { label: 'Run stress test', href: appendQuery(stressTestHref, { sport, tz, date, mode }) },
      { label: 'Use sample slip', href: appendQuery(ingestHref, { sport, tz, date, mode, prefill: DEMO_SLIP }) },
      { label: 'Open Board', href: appendQuery(boardHref, { sport, tz, date, mode }) }
    ]
  };
};

type HubTab = typeof tabs[number];

const toAnalyzeLeg = (run: Run): AnalyzeLeg[] => run.extractedLegs.map((leg) => {
  const enriched = run.enrichedLegs.find((item) => item.extractedLegId === leg.id);
  const riskScore = enriched?.riskScore ?? (enriched ? computeLegRisk(enriched).riskScore : 0);
  return {
    id: leg.id,
    selection: leg.selection,
    market: leg.market,
    line: leg.line,
    odds: leg.odds,
    l5: enriched?.l5 ?? 0,
    l10: enriched?.l10 ?? 0,
    season: enriched?.season,
    vsOpp: enriched?.vsOpp,
    risk: riskScore >= 24 ? 'weak' : riskScore >= 10 ? 'caution' : 'strong',
    divergence: typeof enriched?.flags.divergence === 'number' && enriched.flags.divergence > 0,
    injuryWatch: Boolean(enriched?.flags.injury),
    lineMoved: typeof enriched?.flags.lineMove === 'number' && Math.abs(enriched.flags.lineMove) >= 1,
    riskFactors: enriched?.riskFactors,
    dataSources: enriched?.dataSources
  };
});

export default function ResearchPageContent() {
  const search = useSearchParams();
  const router = useRouter();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [rawSlip, setRawSlip] = useState('');
  const nervous = useNervousSystem();
  const [developerMode, setDeveloperMode] = useState(false);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [demoRecentRun, setDemoRecentRun] = useState<RecentRunDemo | null>(() => toDeterministicDemoRun({
    sport: nervous.sport,
    tz: nervous.tz,
    date: nervous.date,
    mode: nervous.mode,
    stressTestHref: nervous.toHref('/stress-test'),
    ingestHref: nervous.toHref('/ingest'),
    boardHref: nervous.toHref('/today')
  }));
  const [data, setData] = useState<BettorDataEnvelope | null>(null);
  const [snapshotReport, setSnapshotReport] = useState<ResearchReport | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [copySlipStatus, setCopySlipStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [shareStatus, setShareStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [activeTraceId, setActiveTraceId] = useState<string>('');
  const autoDemoTriggeredRef = useRef(false);
  const { slip } = useDraftSlip();

  const tab = (search.get('tab') as HubTab) ?? 'analyze';
  const safeTab: HubTab = tabs.includes(tab) ? tab : 'analyze';
  const traceFromQuery = getQueryTraceId(search) ?? '';
  const prefillFromQuery = search.get('prefill') ?? '';
  const prefillKeyFromQuery = search.get('prefillKey') ?? '';
  const snapshotIdFromQuery = search.get('snapshotId') ?? '';

  const refreshRecent = useCallback(async () => {
    const runs = await runStore.listRuns(5);
    setRecentRuns(runs.map((run) => ({ traceId: run.trace_id, updatedAt: run.updatedAt, status: toRecentStatus(run) })));
  }, []);

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
    void refreshRecent();
    const loadData = () => fetch(`/api/bettor-data?sport=${encodeURIComponent(nervous.sport)}&tz=${encodeURIComponent(nervous.tz)}&date=${encodeURIComponent(nervous.date)}`, { headers: { 'x-live-mode': readLiveModeEnabled() ? 'true' : 'false' } })
      .then((res) => res.json())
      .then((payload) => setData(payload as BettorDataEnvelope))
      .catch(() => undefined);

    if (typeof window !== 'undefined') {
      void loadData();
      const onLiveModeChange = () => {
        void loadData();
      };
      window.addEventListener(LIVE_MODE_EVENT, onLiveModeChange);
      return () => window.removeEventListener(LIVE_MODE_EVENT, onLiveModeChange);
    }
  }, [nervous.date, nervous.sport, nervous.tz, refreshRecent]);

  useEffect(() => {
    if (recentRuns.length > 0) {
      setDemoRecentRun(null);
      return;
    }

    setDemoRecentRun(toDeterministicDemoRun({
      sport: nervous.sport,
      tz: nervous.tz,
      date: nervous.date,
      mode: nervous.mode,
      stressTestHref: nervous.toHref('/stress-test'),
      ingestHref: nervous.toHref('/ingest'),
      boardHref: nervous.toHref('/today')
    }));

    let active = true;
    fetch(`/api/research/demo-run?${new URLSearchParams({ sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode }).toString()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        setDemoRecentRun(payload as RecentRunDemo);
      })
      .catch(() => {
        if (!active) return;
        setDemoRecentRun(toDeterministicDemoRun({
          sport: nervous.sport,
          tz: nervous.tz,
          date: nervous.date,
          mode: nervous.mode,
          stressTestHref: nervous.toHref('/stress-test'),
          ingestHref: nervous.toHref('/ingest'),
          boardHref: nervous.toHref('/today')
        }));
      });

    return () => {
      active = false;
    };
  }, [recentRuns.length, nervous.date, nervous.mode, nervous.sport, nervous.tz, nervous]);


  useEffect(() => {
    if (traceFromQuery) {
      setActiveTraceId(traceFromQuery);
      autoDemoTriggeredRef.current = true;
    }
  }, [traceFromQuery]);

  useEffect(() => {
    if (autoDemoTriggeredRef.current) return;
    if (nervous.mode !== 'demo' || safeTab !== 'analyze') return;
    if (traceFromQuery || prefillFromQuery || prefillKeyFromQuery || rawSlip.trim()) return;
    if (getLatestTraceId()) return;

    autoDemoTriggeredRef.current = true;
    setRawSlip(DEMO_SLIP);
    void runSlip(DEMO_SLIP, { coverageAgentEnabled: readCoverageAgentEnabled() }).then(async (traceId) => {
      setActiveTraceId(traceId);
      await refreshRecent();
      router.replace(appendQuery(nervous.toHref('/stress-test', { trace_id: traceId }), { tab: 'analyze' }));
    }).catch(() => {
      autoDemoTriggeredRef.current = false;
    });
  }, [nervous, prefillFromQuery, prefillKeyFromQuery, rawSlip, refreshRecent, router, safeTab, traceFromQuery]);
  useEffect(() => {
    if (traceFromQuery) {
      void runStore.getRun(traceFromQuery).then((run) => setCurrentRun(run));
      return;
    }
    void runStore.listRuns(1).then((runs) => setCurrentRun(runs[0] ?? null));
  }, [traceFromQuery]);

  useEffect(() => {
    if (prefillFromQuery) {
      setRawSlip(prefillFromQuery);
      void runSlip(prefillFromQuery, { coverageAgentEnabled: readCoverageAgentEnabled() }).then(async (traceId) => {
        await refreshRecent();
        router.replace(appendQuery(nervous.toHref('/stress-test', { trace_id: traceId }), { tab: 'analyze' }));
      });
      return;
    }

    if (!prefillKeyFromQuery || typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(prefillKeyFromQuery);
    if (!stored) return;
    window.sessionStorage.removeItem(prefillKeyFromQuery);
    setRawSlip(stored);
    void runSlip(stored, { coverageAgentEnabled: readCoverageAgentEnabled() }).then(async (traceId) => {
      await refreshRecent();
      router.replace(appendQuery(nervous.toHref('/stress-test', { trace_id: traceId }), { tab: 'analyze' }));
    });
  }, [prefillFromQuery, prefillKeyFromQuery, refreshRecent, router, nervous]);

  useEffect(() => {
    const snapshotId = currentRun?.snapshotId ?? snapshotIdFromQuery;
    if (!snapshotId) {
      setSnapshotReport(null);
      return;
    }

    let active = true;
    fetch(`/api/researchSnapshot/${encodeURIComponent(snapshotId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload || payload.error) return;
        setSnapshotReport(payload as ResearchReport);
      })
      .catch(() => {
        if (active) setSnapshotReport(null);
      });

    return () => {
      active = false;
    };
  }, [currentRun?.snapshotId, snapshotIdFromQuery]);

  const legs = useMemo(() => (currentRun ? toAnalyzeLeg(currentRun) : []), [currentRun]);
  const sortedLegs = useMemo(() => {
    if (!currentRun) return legs;
    return [...legs].sort((a, b) => {
      const left = currentRun.enrichedLegs.find((leg) => leg.extractedLegId === a.id)?.riskScore ?? 0;
      const right = currentRun.enrichedLegs.find((leg) => leg.extractedLegId === b.id)?.riskScore ?? 0;
      return right - left;
    });
  }, [legs, currentRun]);

  const weakestLeg = useMemo(() => {
    if (!currentRun?.analysis.weakestLegId) return sortedLegs[0] ?? null;
    return sortedLegs.find((leg) => leg.id === currentRun.analysis.weakestLegId) ?? sortedLegs[0] ?? null;
  }, [sortedLegs, currentRun]);

  const submitPaste = useCallback(async () => {
    const traceId = await runSlip(rawSlip, { coverageAgentEnabled: readCoverageAgentEnabled() });
    setPasteOpen(false);
    await refreshRecent();
    router.push(withTraceId(nervous.toHref('/stress-test'), traceId));
  }, [rawSlip, refreshRecent, router, nervous]);

  const runDto = useMemo(() => {
    if (!currentRun) return null;
    const base = toResearchRunDTOFromRun(currentRun);
    const merged = snapshotReport ? mergeSnapshotHighlights(base, snapshotReport) : base;
    return validateResearchRunDTO(merged) ? merged : null;
  }, [currentRun, snapshotReport]);

  const intelLegs = useMemo(() => (runDto?.legs?.length
    ? runDto.legs.map((leg) => ({ id: leg.id, player: leg.player, selection: leg.selection, market: leg.market, line: leg.line, odds: leg.odds, team: leg.team }))
    : slip), [runDto, slip]);

  const slipHref = nervous.toHref('/slip');
  const boardHref = appendQuery(nervous.toHref('/today'), { tab: 'board' });
  const latestRunHref = useMemo(() => {
    const latestFromStorage = () => {
      if (typeof window === 'undefined') return null;
      const raw = window.localStorage.getItem('rb:runs:v1');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as Array<{ trace_id?: string; traceId?: string; updatedAt?: string }>;
        if (!Array.isArray(parsed) || parsed.length === 0) return null;
        const latest = [...parsed]
          .filter((run) => run.trace_id || run.traceId)
          .sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''))[0];
        return latest?.trace_id ?? latest?.traceId ?? null;
      } catch {
        return null;
      }
    };

    const latest = getLatestTraceId() ?? latestFromStorage();
    return latest ? withTraceId(nervous.toHref('/research'), latest) : null;
  }, [nervous]);

  const copyReasons = useCallback(async () => {
    const reasons = runDto?.verdict.reasons ?? currentRun?.analysis.reasons ?? [];
    const weakestReasons = weakestLeg?.riskFactors?.slice(0, 2) ?? [];
    const bullets = [...reasons, ...weakestReasons].filter(Boolean).slice(0, 4);
    const weakestLine = weakestLeg?.selection ? `Weakest leg: ${weakestLeg.selection}` : '';
    const uncertaintyLine = currentRun?.analysis.dataQuality?.confidenceCapReason ? `Uncertainty: ${currentRun.analysis.dataQuality.confidenceCapReason}` : '';
    const payload = [weakestLine, ...bullets.map((entry) => `- ${entry}`), uncertaintyLine].filter(Boolean).join('\n');
    if (!payload || typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyStatus('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      setCopyStatus('done');
      window.setTimeout(() => setCopyStatus('idle'), 1200);
    } catch {
      setCopyStatus('error');
    }
  }, [runDto, currentRun, weakestLeg]);

  const copySlip = useCallback(async () => {
    const legsToCopy = (runDto?.legs.map((leg) => leg.selection) ?? legs.map((leg) => leg.selection)).filter(Boolean);
    const payload = legsToCopy.map((leg, index) => `${index + 1}. ${leg}`).join('\n');
    if (!payload || typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopySlipStatus('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      setCopySlipStatus('done');
      window.setTimeout(() => setCopySlipStatus('idle'), 1200);
    } catch {
      setCopySlipStatus('error');
    }
  }, [legs, runDto]);

  const shareRun = useCallback(async () => {
    const traceId = runDto?.trace_id ?? currentRun?.trace_id ?? activeTraceId ?? traceFromQuery;
    const shareHref = buildShareRunHref(nervous, traceId);
    if (!shareHref || typeof navigator === 'undefined' || !navigator.clipboard) {
      setShareStatus('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareHref);
      setShareStatus('done');
      window.setTimeout(() => setShareStatus('idle'), 1200);
    } catch {
      setShareStatus('error');
    }
  }, [activeTraceId, currentRun?.trace_id, nervous, runDto?.trace_id, traceFromQuery]);

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <header className="space-y-3">
        <TruthSpineHeader
          title="Stress Test"
          subtitle="During loop: isolate the weakest leg and enforce process over impulse."
          actions={[
            { label: 'Build from Board', href: boardHref },
            ...(latestRunHref ? [{ label: 'Open latest run', href: latestRunHref, tone: 'primary' as const }] : []),
            { label: 'Try sample slip (demo)', href: appendQuery(nervous.toHref('/ingest'), { demo: 1 }) }
          ]}
          traceId={traceFromQuery || nervous.trace_id}
        />
        <RunStatusPill traceId={traceFromQuery || nervous.trace_id} mode={nervous.mode} generatedAt={new Date().toISOString()} seedHint={`${nervous.sport}:${nervous.date}:${nervous.tz}`} />
        <div className="flex flex-wrap gap-2 text-xs">
          <a href="#fragility" className="rounded-full border border-white/20 px-2 py-1 text-slate-300">Why fragile?</a>
          <a href="#correlation" className="rounded-full border border-white/20 px-2 py-1 text-slate-300">Correlation risk</a>
        </div>
        <div className="flex w-fit gap-2 rounded-xl bg-slate-950/60 p-1">
          {tabs.map((candidate) => (
            <button key={candidate} type="button" onClick={() => router.push(appendQuery(nervous.toHref('/stress-test'), { tab: candidate }))} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${safeTab === candidate ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>{candidate}</button>
          ))}
        </div>
      </header>

      {safeTab === 'analyze' ? (
        <AnalyzeTabPanel
          intelLegs={intelLegs}
          legs={legs}
          sortedLegs={sortedLegs}
          weakestLeg={weakestLeg}
          runDto={runDto}
          currentRun={currentRun}
          prefillKeyFromQuery={prefillKeyFromQuery}
          copyStatus={copyStatus}
          copySlipStatus={copySlipStatus}
          onPasteOpen={() => setPasteOpen(true)}
          onTryExample={() => router.push(appendQuery(nervous.toHref('/ingest'), { prefill: DEMO_SLIP }))}
          onCopyReasons={() => void copyReasons()}
          onCopySlip={() => void copySlip()}
          onShareRun={() => void shareRun()}
          slipHref={slipHref}
          boardHref={boardHref}
          shareStatus={shareStatus}
          uncertainty={currentRun?.analysis.dataQuality?.confidenceCapReason}
          demoSlip={DEMO_SLIP}
          latestRunHref={latestRunHref}
        />
      ) : null}

      {safeTab === 'scout' ? <ScoutTabPanel data={data} /> : null}
      {safeTab === 'live' ? <LiveTabPanel data={data} /> : null}

      <div id="fragility"><RecentActivityPanel
        runs={recentRuns}
        demoRun={demoRecentRun}
        onOpen={(recentTraceId) => router.push(withTraceId(nervous.toHref('/stress-test'), recentTraceId))}
      /></div>
      <div id="correlation"><HowItWorksMini /></div>

      <AdvancedDrawer developerMode={developerMode}>
        <div className="flex flex-wrap gap-2"><Chip>Mode: {data?.mode ?? 'loading'}</Chip></div>
      </AdvancedDrawer>

      {pasteOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <Surface className="w-full max-w-2xl">
            <h2 className="text-lg font-semibold">Paste slip</h2>
            <textarea className="mt-3 h-56 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" value={rawSlip} onChange={(event) => setRawSlip(event.target.value)} placeholder="Paste each leg on a new line" />
            <div className="mt-3 flex gap-2"><Button intent="primary" onClick={() => void submitPaste()}>Stress Test now</Button><Button intent="secondary" onClick={() => setPasteOpen(false)}>Cancel</Button></div>
          </Surface>
        </div>
      ) : null}
    </section>
  );
}
