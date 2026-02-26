// Archived in Sprint 6: legacy alternate landing variant kept for reference only.
'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ModeHealthStrip } from '../../landing/ModeHealthStrip';
import { ProofStrip } from '../../landing/ProofStrip';
import { appendQuery } from '../../landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { AnchorMetric } from '@/src/components/today/AnchorMetric';
import { LiveOddsBadge } from '@/src/components/today/LiveOddsBadge';
import { TodayLoopPanel } from '@/src/components/today/TodayLoopPanel';
import { TrackerLite, type TrackerEvent, type TrackerStep } from '@/src/components/today/TrackerLite';
import { type LiveOddsPayload, buildBoardViewModel } from '@/src/core/today/boardViewModel';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import type { SlipStructureReport } from '@/src/core/contracts/slipStructureReport';
import { fallbackToday } from '@/src/core/today/fallback';
import { normalizeTodayPayload, type NormalizedToday } from '@/src/core/today/normalize';
import { ensureAnonSessionId } from '@/src/core/identifiers/session';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

type BoardProp = NormalizedToday['board'][number];

type RecentSlip = {
  id: string;
  title: string;
  note: string;
  trace_id?: string;
};

const LAST_TRACE_STORAGE_KEY = 'rb-last-trace-id';
const TRACKER_STEP_LABELS = ['Parse', 'Injuries', 'Lines/Odds', 'Overlap/Correlation', 'Verdict'];

const fallbackRecent: RecentSlip[] = [
  {
    id: 'demo-1',
    title: 'Correlation miss · NBA 2-leg',
    note: 'Two scoring overs in the same pace-down spot reduced the edge.'
  }
];

const makeTraceId = () => `trace_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;

const buildStepState = (activeStep: number): TrackerStep[] => TRACKER_STEP_LABELS.map((label, index) => ({
  label,
  state: index < activeStep ? 'done' : index === activeStep ? 'running' : 'queued'
}));

export default function LandingVisionClient() {
  const router = useRouter();
  const nervous = useNervousSystem();
  const { slip, addLeg, removeLeg } = useDraftSlip();
  const [today, setToday] = useState<NormalizedToday>(() => fallbackToday(nervous));
  const [recent, setRecent] = useState<RecentSlip[]>(fallbackRecent);
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);
  const [report, setReport] = useState<SlipStructureReport | undefined>(undefined);
  const [liveOdds, setLiveOdds] = useState<LiveOddsPayload | undefined>(undefined);
  const [asOf, setAsOf] = useState<Date>(new Date());
  const [todayFeedState, setTodayFeedState] = useState<'ok' | 'warn'>('ok');
  const [marketFeedState, setMarketFeedState] = useState<'ok' | 'warn'>('warn');
  const [trackerVisible, setTrackerVisible] = useState(false);
  const [trackerRunning, setTrackerRunning] = useState(false);
  const [trackerTraceId, setTrackerTraceId] = useState<string | undefined>(undefined);
  const [trackerSteps, setTrackerSteps] = useState<TrackerStep[]>(() => buildStepState(-1));
  const [trackerEvents, setTrackerEvents] = useState<TrackerEvent[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setAsOf(new Date()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLastTraceId(window.localStorage.getItem(LAST_TRACE_STORAGE_KEY));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadBoard = async () => {
      const url = appendQuery('/api/today', {
        sport: nervous.sport,
        tz: nervous.tz,
        date: nervous.date,
        demo: nervous.mode === 'demo' ? '1' : undefined
      });

      try {
        const response = await fetch(url, {
          headers: { 'x-live-mode': nervous.mode === 'live' ? '1' : '0' },
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) {
          setTodayFeedState('warn');
          return;
        }

        const payload = normalizeTodayPayload(await response.json());
        setTodayFeedState('ok');
        setAsOf(new Date());
        setToday((current) => (payload.board.length > 0 ? payload : { ...current, mode: payload.mode, reason: 'empty_board_from_api' }));
      } catch {
        setTodayFeedState('warn');
      }
    };

    const loadLiveOdds = async () => {
      if (nervous.mode !== 'live') {
        setLiveOdds(undefined);
        setMarketFeedState('warn');
        return;
      }

      try {
        const response = await fetch(appendQuery('/api/live/market', { sport: nervous.sport }), {
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) {
          setMarketFeedState('warn');
          return;
        }
        const payload = (await response.json()) as {
          data?: { snapshot?: { loadedAt?: string; games?: LiveOddsPayload['games'] } };
        };
        const snapshot = payload.data?.snapshot;
        const next = snapshot ? { loadedAt: snapshot.loadedAt, games: snapshot.games } : undefined;
        setLiveOdds(next);
        setMarketFeedState(next ? 'ok' : 'warn');
      } catch {
        setLiveOdds(undefined);
        setMarketFeedState('warn');
      }
    };

    const loadRecent = async () => {
      try {
        const anonId = ensureAnonSessionId();
        const response = await fetch(appendQuery('/api/slips/recent', { limit: 2, anon_id: anonId }), { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const payload = (await response.json()) as { slips?: Array<{ id?: string; title?: string; note?: string; trace_id?: string }> };
        if (!Array.isArray(payload.slips) || payload.slips.length === 0) return;
        setRecent(
          payload.slips.slice(0, 2).map((item, index) => ({
            id: item.id ?? `recent-${index}`,
            title: item.title ?? 'Recent slip',
            note: item.note ?? 'Open review for full postmortem context.',
            trace_id: item.trace_id
          }))
        );
      } catch {
        // deterministic fallback remains
      }
    };

    void loadBoard();
    void loadLiveOdds();
    void loadRecent();

    return () => controller.abort();
  }, [nervous.date, nervous.mode, nervous.sport, nervous.tz]);

  const gameById = useMemo(() => new Map(today.games.map((game) => [game.id, game])), [today.games]);
  const boardCards = useMemo(() => buildBoardViewModel(today, liveOdds), [today, liveOdds]);
  const hasLiveOdds = boardCards.some((card) => card.is_live);

  const modeLabel = today.mode === 'demo'
    ? 'Demo mode (live feeds off)'
    : marketFeedState === 'warn' || todayFeedState === 'warn' || !hasLiveOdds
      ? 'Live mode (some feeds unavailable)'
      : 'Live';

  const healthHint = today.mode === 'demo'
    ? 'Demo mode (live feeds off)'
    : modeLabel.includes('some feeds unavailable')
      ? 'Live feeds are partially unavailable; fallback board data remains active.'
      : undefined;

  const onAddLeg = (prop: BoardProp) => {
    addLeg({
      id: prop.id,
      player: prop.player,
      marketType: prop.market,
      line: prop.line,
      odds: prop.odds,
      game: gameById.get(prop.gameId)?.matchup
    });
  };

  const onAddTopProps = () => {
    const topProps = [...today.board].sort((a, b) => b.hitRateL10 - a.hitRateL10).slice(0, 2);
    topProps.forEach(onAddLeg);
  };

  const pollTraceEvents = async (traceId: string) => {
    try {
      const response = await fetch(appendQuery('/api/events', { trace_id: traceId, limit: 3 }), { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as { events?: Array<{ id?: string; event_name?: string; agent_id?: string }> };
      if (!Array.isArray(payload.events) || payload.events.length === 0) return;
      setTrackerEvents(
        payload.events.slice(0, 3).map((event, index) => ({
          id: event.id ?? `${traceId}-${index}`,
          label: `${event.event_name ?? 'event'} · ${event.agent_id ?? 'system'}`
        }))
      );
    } catch {
      // silent to avoid user-facing error toast vibes
    }
  };

  const onRunRisk = () => {
    const traceId = makeTraceId();
    setTrackerTraceId(traceId);
    setTrackerVisible(true);
    setTrackerRunning(true);
    setTrackerEvents([{ id: `${traceId}-0`, label: 'slip_submitted · landing_frontdoor' }]);
    setTrackerSteps(buildStepState(0));

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_TRACE_STORAGE_KEY, traceId);
      setLastTraceId(traceId);
    }

    const timers: number[] = [];
    TRACKER_STEP_LABELS.forEach((label, index) => {
      const timer = window.setTimeout(() => {
        setTrackerSteps(buildStepState(index + 1));
        setTrackerEvents((current) => [
          { id: `${traceId}-${index + 1}`, label: `${label.toLowerCase()}_complete · ${today.mode === 'demo' ? 'demo' : 'runtime'}` },
          ...current
        ].slice(0, 3));

        if (index === TRACKER_STEP_LABELS.length - 1) {
          setTrackerRunning(false);
          setTrackerSteps(TRACKER_STEP_LABELS.map((step) => ({ label: step, state: 'done' })));
        }
      }, 600 + index * 500);
      timers.push(timer);
    });

    const next = buildSlipStructureReport(
      slip.map((leg) => ({
        id: leg.id,
        player: leg.player,
        market: leg.marketType,
        line: String(leg.line ?? ''),
        odds: leg.odds,
        game: leg.game
      })),
      { mode: today.mode, reason: today.reason, trace_id: traceId }
    );
    setReport(next);

    void pollTraceEvents(traceId);

    window.setTimeout(() => {
      timers.forEach((timer) => window.clearTimeout(timer));
    }, 5000);
  };

  return (
    <main className="mx-auto max-w-[1180px] space-y-4 px-4 py-5 text-slate-100 sm:px-6">
      <header className="sticky top-0 z-10 rounded-xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold uppercase tracking-wide">ResearchBets</h1>
            <p className="text-xs text-slate-400">Today → Slip → Risk → Review</p>
          </div>
          <ModeHealthStrip
            mode={today.mode}
            asOf={asOf}
            feeds={[
              { label: 'Today', state: todayFeedState, hint: 'Board feed /api/today' },
              { label: 'Market', state: nervous.mode === 'live' ? marketFeedState : 'warn', hint: 'Live snapshot /api/live/market' }
            ]}
          />
        </div>
      </header>

      <ProofStrip />

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <TodayLoopPanel
            slipCount={slip.length}
            report={report}
            modeLabel={modeLabel}
            healthHint={healthHint}
            onAddTopProps={onAddTopProps}
            onOpenSlip={() => router.push(nervous.toHref('/slip'))}
            onRunRisk={onRunRisk}
            onOpenReview={() => router.push(appendQuery(nervous.toHref('/control'), { tab: 'review', trace_id: lastTraceId ?? undefined }))}
          />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <AnchorMetric report={report} />
        </div>
      </section>

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 rounded-xl border border-slate-800 bg-slate-900/50 p-4 lg:col-span-8" aria-label="today-board">
          <h2 className="text-lg font-semibold">Tonight&apos;s Board</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {boardCards.slice(0, 12).map((card) => {
              const inSlip = slip.some((leg) => leg.id === card.id);
              const prop = today.board.find((entry) => entry.id === card.id);
              if (!prop) return null;

              const volatility = prop.riskTag === 'stable' ? 'Lower volatility profile' : 'Higher volatility profile';
              const reason = prop.hitRateL10 >= 60 ? `L10 hit-rate ${prop.hitRateL10}%` : 'Needs confirmation from risk run';

              return (
                <article key={card.id} className="group rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                  <p className="text-[11px] text-slate-400">{card.game ?? 'TBD matchup'} · {card.start ?? 'TBD'} · {card.league ?? nervous.sport}</p>
                  <p className="mt-1 text-sm font-semibold">{card.selectionLabel}</p>
                  <p className="text-xs text-slate-300">Line {card.line ?? 'n/a'} · hit-rate L10 {card.hit_rate_l10 ?? 0}%</p>
                  <div className="mt-2">
                    <LiveOddsBadge consensus={card.consensus_odds} live_odds={card.live_odds} best_odds={card.best_odds} />
                  </div>
                  <details className="mt-2 text-[11px] text-slate-400">
                    <summary className="cursor-pointer list-none">Inspect ▾</summary>
                    <p className="mt-1">Reason: {reason}</p>
                    <p>Volatility: {volatility}</p>
                  </details>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={inSlip} onClick={() => onAddLeg(prop)} className="rounded bg-cyan-400 px-2 py-1 text-xs font-semibold text-slate-950 disabled:opacity-50">{inSlip ? 'Added' : 'Add to slip'}</button>
                    {inSlip ? (
                      <button type="button" onClick={() => removeLeg(card.id)} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300">Remove</button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="col-span-12 space-y-3 lg:col-span-4">
          <TrackerLite visible={trackerVisible} traceId={trackerTraceId} steps={trackerSteps} events={trackerEvents} running={trackerRunning} />

          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Review past parlays</h2>
            <div className="mt-3 space-y-2">
              {recent.map((item) => (
                <button key={item.id} type="button" onClick={() => router.push(appendQuery(nervous.toHref('/control'), { tab: 'review', trace_id: item.trace_id }))} className="w-full rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-left">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.note}</p>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
