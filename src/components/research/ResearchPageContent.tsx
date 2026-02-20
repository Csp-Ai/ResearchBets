'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import { computeLegRisk, computeVerdict, runSlip } from '@/src/core/pipeline/runSlip';
import { runStore } from '@/src/core/run/store';
import type { Run } from '@/src/core/run/types';
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
  type RecentRun
} from '@/src/components/bettor/BettorFirstBlocks';
import { Button } from '@/src/components/ui/button';
import { Chip } from '@/src/components/ui/chip';
import { Surface } from '@/src/components/ui/surface';
import { ShareReply } from '@/src/components/bettor/ShareReply';

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

export default function ResearchPageContent() {
  const search = useSearchParams();
  const router = useRouter();
  const { fadeUp, stagger } = useMotionVariants();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [rawSlip, setRawSlip] = useState('');
  const [developerMode, setDeveloperMode] = useState(false);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [data, setData] = useState<BettorDataEnvelope | null>(null);

  const tab = (search.get('tab') as HubTab) ?? 'analyze';
  const safeTab: HubTab = tabs.includes(tab) ? tab : 'analyze';
  const traceFromQuery = search.get('trace') ?? search.get('trace_id') ?? '';
  const prefillFromQuery = search.get('prefill') ?? '';

  const refreshRecent = async () => {
    const runs = await runStore.listRuns(5);
    setRecentRuns(runs.map((run) => ({ traceId: run.traceId, updatedAt: run.updatedAt, status: toRecentStatus(run) })));
  };

  useEffect(() => {
    setDeveloperMode(readDeveloperMode());
    void refreshRecent();
    const loadData = () => fetch('/api/bettor-data', { headers: { 'x-live-mode': readLiveModeEnabled() ? 'true' : 'false' } })
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
  }, []);

  useEffect(() => {
    if (traceFromQuery) {
      void runStore.getRun(traceFromQuery).then((run) => setCurrentRun(run));
      return;
    }
    void runStore.listRuns(1).then((runs) => setCurrentRun(runs[0] ?? null));
  }, [traceFromQuery]);

  useEffect(() => {
    if (!prefillFromQuery) return;
    setRawSlip(prefillFromQuery);
    setPasteOpen(true);
  }, [prefillFromQuery]);

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

  const submitPaste = async () => {
    const traceId = await runSlip(rawSlip, { coverageAgentEnabled: readCoverageAgentEnabled() });
    setPasteOpen(false);
    await refreshRecent();
    router.push(`/research?trace=${encodeURIComponent(traceId)}`);
  };

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

  return (
    <motion.section initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <motion.header variants={fadeUp} className="bettor-card p-5">
        <h1 className="text-3xl font-semibold">Research Hub</h1>
        <p className="mt-1 text-sm text-slate-300">Analyze slips, scout props, and check live win likelihood from one bettor-first workspace.</p>
        <div className="mt-4 flex gap-2 rounded-xl bg-slate-950/60 p-1 w-fit">
          {tabs.map((candidate) => (
            <button key={candidate} type="button" onClick={() => router.push(`/research?tab=${candidate}`)} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${safeTab === candidate ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>{candidate}</button>
          ))}
        </div>
      </motion.header>

      {safeTab === 'analyze' ? (
        <motion.div variants={fadeUp} className="space-y-5">
          {legs.length === 0 ? <EmptyStateBettor onPaste={() => setPasteOpen(true)} /> : (
            <>
              <VerdictHero confidence={currentRun?.analysis.confidencePct ?? 0} weakestLeg={weakestLeg} reasons={currentRun?.analysis.reasons ?? []} dataQuality="Partial live" />
              <SlipActionsBar onRemoveWeakest={() => void removeWeakest()} onRerun={() => router.push('/ingest')} canTrack />
              <Surface className="space-y-4"><h2 className="text-xl font-semibold">Ranked legs (weakest to strongest)</h2><LegRankList legs={sortedLegs} onRemove={() => void removeWeakest()} trustedContext={currentRun?.trustedContext} /></Surface>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button intent="primary" onClick={() => setPasteOpen(true)}>Paste slip</Button>
            <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={() => router.push(`/ingest?prefill=${encodeURIComponent(DEMO_SLIP)}`)}>Try an example</button>
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

      <RecentActivityPanel runs={recentRuns} onOpen={(recentTraceId) => router.push(`/research?trace=${encodeURIComponent(recentTraceId)}`)} />
      <HowItWorksMini />

      <AdvancedDrawer developerMode={developerMode}>
        <div className="flex flex-wrap gap-2"><Chip>Mode: {data?.mode ?? 'loading'}</Chip></div>
      </AdvancedDrawer>

      {pasteOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <Surface className="w-full max-w-2xl">
            <h2 className="text-lg font-semibold">Paste slip</h2>
            <textarea className="mt-3 h-56 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" value={rawSlip} onChange={(event) => setRawSlip(event.target.value)} placeholder="Paste each leg on a new line" />
            <div className="mt-3 flex gap-2"><Button intent="primary" onClick={() => void submitPaste()}>Analyze now</Button><Button intent="secondary" onClick={() => setPasteOpen(false)}>Cancel</Button></div>
          </Surface>
        </div>
      ) : null}
    </motion.section>
  );
}
