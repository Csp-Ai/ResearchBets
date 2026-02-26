'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import { computeLegRisk, computeVerdict, runSlip } from '@/src/core/pipeline/runSlip';
import { runStore } from '@/src/core/run/store';
import type { Run } from '@/src/core/run/types';
import type { ResearchReport } from '@/src/core/evidence/evidenceSchema';
import { mergeSnapshotHighlights, toResearchRunDTOFromRun, validateResearchRunDTO } from '@/src/core/run/researchRunDTO';
import { LIVE_MODE_EVENT, readCoverageAgentEnabled, readDeveloperMode, readLiveModeEnabled } from '@/src/core/ui/preferences';
import { useMotionVariants } from '@/src/components/bettor-os/motion';
import type { BettorDataEnvelope } from '@/src/core/bettor/gateway.server';
import {
  AdvancedDrawer,
  EmptyStateBettor,
  HowItWorksMini,
  LegRankList,
  RecentActivityPanel,
  SlipActionsBar,
  VerdictHero,
  type AnalyzeLeg,
  type RecentRun,
  type RecentRunDemo
} from '@/src/components/bettor/BettorFirstBlocks';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';
import { ShareReply } from '@/src/components/bettor/ShareReply';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';

const DEMO_SLIP = `Jayson Tatum over 29.5 points (-110)
Luka Doncic over 8.5 assists (-120)
LeBron James over 6.5 rebounds (-105)`;

const toRecentStatus = (run: Run): RecentRun['status'] => (run.status === 'complete' ? 'complete' : 'running');
const tabs = ['analyze', 'scout', 'live'] as const;

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


function SnapshotHighlights({ cards }: { cards: Array<{ title: string; bullets: string[]; severity?: 'info' | 'warn' | 'danger'; source?: string }> }) {
  if (cards.length === 0) return null;
  const toneClass = (severity?: 'info' | 'warn' | 'danger') => severity === 'danger' ? 'border-rose-700/70' : severity === 'warn' ? 'border-amber-700/70' : 'border-cyan-700/70';
  return (
    <Surface className="space-y-3">
      <h2 className="text-xl font-semibold">Snapshot highlights</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.slice(0, 2).map((card) => (
          <div key={card.title} className={`rounded-lg border bg-slate-950/40 p-3 ${toneClass(card.severity)}`}>
            <p className="font-medium">{card.title}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-300">
              {card.bullets.slice(0, 4).map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
            {card.source ? <p className="mt-2 text-xs text-slate-500">Source: {card.source}</p> : null}
          </div>
        ))}
      </div>
    </Surface>
  );
}

export default function ResearchPageContent() {
  const search = useSearchParams();
  const router = useRouter();
  const { fadeUp, stagger } = useMotionVariants();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [rawSlip, setRawSlip] = useState('');
  const nervous = useNervousSystem();
  const [developerMode, setDeveloperMode] = useState(false);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [demoRecentRun, setDemoRecentRun] = useState<RecentRunDemo | null>(null);
  const [data, setData] = useState<BettorDataEnvelope | null>(null);
  const [snapshotReport, setSnapshotReport] = useState<ResearchReport | null>(null);
  const { slip } = useDraftSlip();

  const tab = (search.get('tab') as HubTab) ?? 'analyze';
  const safeTab: HubTab = tabs.includes(tab) ? tab : 'analyze';
  const traceFromQuery = search.get('trace') ?? search.get('trace_id') ?? '';
  const prefillFromQuery = search.get('prefill') ?? '';
  const prefillKeyFromQuery = search.get('prefillKey') ?? '';
  const snapshotIdFromQuery = search.get('snapshotId') ?? '';

  const refreshRecent = useCallback(async () => {
    const runs = await runStore.listRuns(5);
    setRecentRuns(runs.map((run) => ({ traceId: run.traceId, updatedAt: run.updatedAt, status: toRecentStatus(run) })));
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

    let active = true;
    fetch(`/api/research/demo-run?${new URLSearchParams({ sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode }).toString()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        setDemoRecentRun(payload as RecentRunDemo);
      })
      .catch(() => {
        if (!active) return;
        const query = { sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode };
        setDemoRecentRun({
          traceId: 'demo-trace',
          steps: ['Scout', 'Risk', 'Notes'],
          weakestLeg: "Tonight's board signal",
          generatedAt: new Date().toISOString(),
          ctas: [
            { label: 'Run stress test', href: appendQuery(nervous.toHref('/stress-test'), query) },
            { label: 'Use sample slip', href: appendQuery(nervous.toHref('/ingest'), { ...query, prefill: DEMO_SLIP }) },
            { label: 'Open Board', href: appendQuery(nervous.toHref('/today'), query) }
          ]
        });
      });

    return () => {
      active = false;
    };
  }, [recentRuns.length, nervous.date, nervous.mode, nervous.sport, nervous.tz, nervous]);

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
    router.push(appendQuery(nervous.toHref('/stress-test'), { trace: traceId }));
  }, [rawSlip, refreshRecent, router, nervous]);


  const runDto = useMemo(() => {
    if (!currentRun) return null;
    const base = toResearchRunDTOFromRun(currentRun);
    const merged = snapshotReport ? mergeSnapshotHighlights(base, snapshotReport) : base;
    return validateResearchRunDTO(merged) ? merged : null;
  }, [currentRun, snapshotReport]);

  const removeWeakest = async () => {
    if (!currentRun?.analysis.weakestLegId) return;
    const enrichedLegs = currentRun.enrichedLegs.filter((leg) => leg.extractedLegId !== currentRun.analysis.weakestLegId).map((leg) => {
      const risk = computeLegRisk(leg);
      return { ...leg, riskScore: risk.riskScore, riskBand: risk.riskBand, riskFactors: risk.factors };
    });
    const analysis = computeVerdict(enrichedLegs, currentRun.extractedLegs.filter((leg) => leg.id !== currentRun.analysis.weakestLegId), currentRun.sources, currentRun.trustedContext?.coverage.injuries ?? 'fallback');
    const next: Run = { ...currentRun, enrichedLegs, extractedLegs: currentRun.extractedLegs.filter((leg) => leg.id !== currentRun.analysis.weakestLegId), analysis, status: 'complete', updatedAt: new Date().toISOString() };
    await runStore.updateRun(next.traceId, next);
    setCurrentRun(next);
  };

  const intelLegs = useMemo(() => (runDto?.legs?.length
    ? runDto.legs.map((leg) => ({ id: leg.id, player: leg.player, selection: leg.selection, market: leg.market, line: leg.line, odds: leg.odds, team: leg.team }))
    : slip), [runDto, slip]);

  return (
    <motion.section initial="hidden" animate="show" variants={stagger} className="mx-auto max-w-6xl space-y-4">
      <motion.header variants={fadeUp} className="bettor-card p-5">
        <h1 className="text-3xl font-semibold">Stress Test</h1>
        <p className="mt-1 text-sm text-slate-300">Run full slip stress tests, inspect weakest-leg risk drivers, and decide before placing.</p>
        <div className="mt-4 flex gap-2 rounded-xl bg-slate-950/60 p-1 w-fit">
          {tabs.map((candidate) => (
            <button key={candidate} type="button" onClick={() => router.push(appendQuery(nervous.toHref('/stress-test'), { tab: candidate }))} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${safeTab === candidate ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>{candidate}</button>
          ))}
        </div>
      </motion.header>

      {safeTab === 'analyze' ? (
        <motion.div variants={fadeUp} className="space-y-4">
          <SlipIntelBar legs={intelLegs} />
          {legs.length === 0 ? <EmptyStateBettor onPaste={() => setPasteOpen(true)} /> : (
            <>
              <VerdictHero confidence={runDto?.verdict.confidence ?? currentRun?.analysis.confidencePct ?? 0} weakestLeg={weakestLeg} reasons={runDto?.verdict.reasons ?? currentRun?.analysis.reasons ?? []} dataQuality="Partial live" />
              {runDto?.snapshotHighlights?.length ? <SnapshotHighlights cards={runDto.snapshotHighlights} /> : null}
              <SlipActionsBar onRemoveWeakest={() => void removeWeakest()} onRerun={() => router.push(nervous.toHref('/ingest'))} canTrack />
              <Surface className="space-y-4"><h2 className="text-xl font-semibold">Ranked legs (weakest to strongest)</h2><LegRankList legs={sortedLegs} onRemove={() => void removeWeakest()} trustedContext={currentRun?.trustedContext} /></Surface>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {prefillKeyFromQuery ? <Chip tone="strong">Draft from Scout</Chip> : null}
            <Button intent="primary" onClick={() => setPasteOpen(true)}>Paste slip</Button>
            <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={() => router.push(appendQuery(nervous.toHref('/ingest'), { prefill: DEMO_SLIP }))}>Try an example</button>
          </div>
          {currentRun ? <ShareReply run={currentRun} /> : null}
        </motion.div>
      ) : null}

      {safeTab === 'scout' ? (
        <motion.div variants={fadeUp} className="space-y-4">
          <p className="text-sm text-slate-400">Active players only. Suggestions are research signals, not guarantees.</p>
          {data?.games.map((game) => (
            <div key={game.id} className="bettor-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{game.matchup}</h3>
                <Chip>{game.status === 'live' ? 'Live now' : game.startTime}</Chip>
              </div>
              <p className="mt-2 text-sm text-slate-300">Active core: {game.activePlayers.map((player) => `${player.name} (${player.role})`).join(' • ')}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {game.propSuggestions.map((prop) => (
                  <div key={prop.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <p className="font-medium">{prop.player} — {prop.market} {prop.line} ({prop.odds})</p>
                    <p className="text-sm text-emerald-300">Hit {Math.round(prop.hitRateL5 * 5)}/5 recently ({Math.round(prop.hitRateL10 * 10)}/10 optional context)</p>
                    <ul className="mt-2 list-disc pl-4 text-sm text-slate-300">{prop.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                    <p className="mt-2 text-xs text-amber-300">Uncertainty: {prop.uncertainty}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      ) : null}

      {safeTab === 'live' ? (
        <motion.div variants={fadeUp} className="space-y-4">
          {data?.games.map((game) => (
            <div key={game.id} className="bettor-card p-4">
              <h3 className="text-lg font-semibold">{game.matchup}</h3>
              <p className="text-sm text-slate-300">{game.awayTeam} ({game.awayRecord}) @ {game.homeTeam} ({game.homeRecord})</p>
              <p className="mt-2 text-sm">Win likelihood: {game.homeTeam} {Math.round(game.homeWinProbability * 100)}% • {game.awayTeam} {Math.round(game.awayWinProbability * 100)}%</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-slate-300">{game.matchupReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </div>
          ))}
        </motion.div>
      ) : null}

      <RecentActivityPanel
        runs={recentRuns}
        demoRun={demoRecentRun}
        onOpen={(recentTraceId) => router.push(appendQuery(nervous.toHref('/stress-test'), { trace: recentTraceId }))}
      />
      <HowItWorksMini />

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
    </motion.section>
  );
}
