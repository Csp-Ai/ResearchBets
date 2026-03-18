'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { LiveCredibilityStrip } from '@/app/cockpit/components/LiveCredibilityStrip';
import { AttemptsChips } from '@/src/components/landing/AttemptsChips';
import { PreviewStrip } from '@/src/components/landing/PreviewStrip';
import { TicketEmptyCoach } from '@/src/components/landing/TicketEmptyCoach';
import { flyToTicket } from '@/src/components/landing/flyToTicket';
import { RunIntegrityPanel } from '@/app/cockpit/components/RunIntegrityPanel';
import { useCockpitToday } from '@/app/cockpit/hooks/useCockpitToday';
import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { CockpitHeader } from '@/src/components/cockpit/CockpitHeader';
import { CockpitShell } from '@/src/components/cockpit/CockpitShell';
import { Chip as LandingChip, Panel, PanelHeader } from '@/src/components/landing/ui';
import { spineHref } from '@/src/core/nervous/spineNavigation';
import type { MarketType } from '@/src/core/markets/marketType';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import { formatPct, formatSignedPct } from '@/src/core/markets/edgePrimitives';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { Button } from '@/src/components/ui/button';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { useRunEvents } from '@/src/core/events/useRunEvents';
import { ensureTraceId } from '@/src/core/trace/trace_id';
import type { ResearchProvenance } from '@/src/core/run/researchRunDTO';

import './cockpit.css';

type Stage = 'Before' | 'Analyze' | 'During' | 'After';

const COCKPIT_MARKETS: MarketType[] = ['spread', 'total', 'moneyline', 'ra', 'points', 'threes', 'rebounds', 'assists', 'pra'];
const toMarketType = (market: string): MarketType => {
  const normalized = market.toLowerCase();
  return (COCKPIT_MARKETS.includes(normalized as MarketType) ? normalized : 'points') as MarketType;
};

const toPreviewStatusLabel = (mode: 'live' | 'cache' | 'demo') => {
  if (mode === 'demo') return 'Demo mode (live feeds off)';
  if (mode === 'cache') return 'Using cached slate';
  return 'Live mode';
};


const confidenceLabel = (leg: CockpitBoardLeg) => {
  if (typeof leg.confidencePct === 'number') {
    if (leg.confidencePct >= 70) return 'High confidence';
    if (leg.confidencePct >= 58) return 'Medium confidence';
    return 'Thin confidence';
  }
  if (typeof leg.hitRateL10 === 'number') {
    if (leg.hitRateL10 >= 7) return 'High confidence';
    if (leg.hitRateL10 >= 6) return 'Medium confidence';
  }
  return 'Watchlist confidence';
};

const fragilityLabel = (leg: CockpitBoardLeg) => {
  if (leg.deadLegRisk === 'high') return 'Can break a ticket fast';
  if (leg.deadLegRisk === 'med') return 'Needs script support';
  if (leg.deadLegRisk === 'low') return 'Lower downside pressure';
  if (leg.riskTag === 'watch') return 'Higher swing profile';
  return 'Steadier profile';
};

const bestContextCue = (leg: CockpitBoardLeg) => {
  if (typeof leg.threesAttL3Avg === 'number') return `3PA L3 ${leg.threesAttL3Avg.toFixed(1)}`;
  if (typeof leg.fgaL3Avg === 'number') return `FGA L3 ${leg.fgaL3Avg.toFixed(1)}`;
  if (typeof leg.hitRateL10 === 'number') return `L10 ${leg.hitRateL10}/10`;
  return null;
};

const confidenceSignal = (leg: CockpitBoardLeg): { label: string; variant: 'good' | 'neutral' | 'warn' } => {
  if (typeof leg.confidencePct === 'number') {
    if (leg.confidencePct >= 70) return { label: `Conf ${Math.round(leg.confidencePct)}%`, variant: 'good' };
    if (leg.confidencePct >= 58) return { label: `Conf ${Math.round(leg.confidencePct)}%`, variant: 'neutral' };
    return { label: `Conf ${Math.round(leg.confidencePct)}%`, variant: 'warn' };
  }
  if (typeof leg.hitRateL10 === 'number') {
    if (leg.hitRateL10 >= 7) return { label: `Conf L10 ${leg.hitRateL10}/10`, variant: 'good' };
    if (leg.hitRateL10 >= 6) return { label: `Conf L10 ${leg.hitRateL10}/10`, variant: 'neutral' };
    return { label: `Conf L10 ${leg.hitRateL10}/10`, variant: 'warn' };
  }
  return { label: 'Conf watchlist', variant: 'neutral' };
};

const edgeSignal = (leg: CockpitBoardLeg): { label: string; variant: 'good' | 'neutral' | 'warn' } | null => {
  if (typeof leg.edgeDelta !== 'number') return null;
  if (leg.edgeDelta >= 0.06) return { label: `Edge ${formatSignedPct(leg.edgeDelta)}`, variant: 'good' };
  if (leg.edgeDelta >= 0.03) return { label: `Edge ${formatSignedPct(leg.edgeDelta)}`, variant: 'neutral' };
  return { label: `Edge ${formatSignedPct(leg.edgeDelta)}`, variant: 'warn' };
};

const fragilitySignal = (leg: CockpitBoardLeg): { label: string; variant: 'good' | 'neutral' | 'warn' | 'bad' } => {
  if (leg.deadLegRisk === 'high') return { label: 'Fragility high', variant: 'bad' };
  if (leg.deadLegRisk === 'med') return { label: 'Fragility med', variant: 'warn' };
  if (leg.deadLegRisk === 'low') return { label: 'Fragility low', variant: 'good' };
  if (leg.riskTag === 'watch') return { label: 'Fragility watch', variant: 'warn' };
  return { label: 'Fragility steady', variant: 'neutral' };
};

export default function CockpitLandingClient({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const cockpitRef = useRef<HTMLElement | null>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const saveInputRef = useRef<HTMLInputElement | null>(null);
  const ticketBadgeRef = useRef<HTMLSpanElement | null>(null);
  const mobileTicketCtaRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const nervous = useNervousSystem();
  const [selectedSport, setSelectedSport] = useState<'NBA' | 'NFL'>(() => {
    const fromParams = typeof searchParams?.sport === 'string' ? searchParams.sport.toUpperCase() : '';
    if (fromParams === 'NFL') return 'NFL';
    return nervous.sport === 'NFL' ? 'NFL' : 'NBA';
  });
  const [selectedMode, setSelectedMode] = useState<'live' | 'demo'>(() => {
    if (searchParams?.mode === 'demo') return 'demo';
    return nervous.mode === 'demo' ? 'demo' : 'live';
  });
  const {
    board,
    today,
    provenance,
    neutralStatus,
    strictLiveUnavailable,
    boardUpdateTick,
    refreshToday
  } = useCockpitToday({ ...nervous, sport: selectedSport, mode: selectedMode });
  const { slip, addLeg, removeLeg, updateLeg } = useDraftSlip();

  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [analysis, setAnalysis] = useState({
    running: false,
    weakestId: '',
    weakestLabel: '—',
    traceId: nervous.trace_id,
    corrLabel: '—',
    fragility: null as number | null,
    reasons: [] as string[],
    stage: 'Before' as Stage,
    runProvenance: undefined as ResearchProvenance | undefined
  });
  const [pulseToken, setPulseToken] = useState(0);
  const [phaseStep, setPhaseStep] = useState<null | 'Ingest' | 'Normalize' | 'Score' | 'Verdict'>(null);
  const [ui, setUi] = useState({
    navDrawerOpen: false,
    slipSheetOpen: false,
    pasteModalOpen: false,
    saveModalOpen: false,
    accountOpen: false,
    tzOpen: false,
    tz: 'ET'
  });
  const [ticketHeaderPulse, setTicketHeaderPulse] = useState(false);


  const onSetMode = (mode: 'live' | 'demo') => {
    setSelectedMode(mode);
    setPulseToken((v) => v + 1);
    const href = nervous.toHref(pathname || '/cockpit', { mode });
    router.replace(href);
  };

  const onSetSport = (sport: 'NBA' | 'NFL') => {
    setSelectedSport(sport);
    setPulseToken((v) => v + 1);
    const href = nervous.toHref(pathname || '/cockpit', { sport });
    router.replace(href);
  };

  const onOpenLeg = (leg: (typeof board)[number]) => {
    const href = nervous.toHref(`/game/${encodeURIComponent(leg.gameId)}`, {
      tab: 'live',
      highlight: leg.id
    });
    router.push(href);
  };

  const groupedGames = useMemo(() => {
    const filtered = board.filter((leg) => {
      const hay = `${leg.matchup} ${leg.player} ${leg.market}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });

    return filtered.reduce<Record<string, typeof board>>((acc, leg) => {
      const key = `${leg.matchup} • ${leg.startTime}`;
      if (!acc[key]) acc[key] = [];
      acc[key]?.push(leg);
      return acc;
    }, {});
  }, [board, query]);

  const previewStatusLabel = useMemo(() => {
    const payloadMode = today.mode ?? provenance.mode;
    return toPreviewStatusLabel(payloadMode);
  }, [today.mode, provenance.mode]);

  const scoutSignals = useMemo<Array<{
    id: string;
    headline: string;
    confidence: string;
    confidenceTone: 'good' | 'warn';
    rationale: string;
    context: string;
    leg: (typeof board)[number];
  }>>(() => {
    return board
      .slice()
      .sort((a, b) => {
        const aHit = typeof a.hitRateL10 === 'number' ? a.hitRateL10 : 0;
        const bHit = typeof b.hitRateL10 === 'number' ? b.hitRateL10 : 0;
        if (bHit !== aHit) return bHit - aHit;
        if (a.riskTag === b.riskTag) return 0;
        return a.riskTag === 'stable' ? -1 : 1;
      })
      .slice(0, 3)
      .map((leg) => {
        const hitRate = typeof leg.hitRateL10 === 'number' ? leg.hitRateL10 : null;
        const confidence = hitRate !== null && hitRate >= 7
          ? 'High confidence'
          : hitRate !== null && hitRate >= 6
            ? 'Medium confidence'
            : 'Watchlist';
        const rationale = typeof leg.threesAttL3Avg === 'number'
          ? `3PA L3 ${leg.threesAttL3Avg.toFixed(1)} supports this line.`
          : typeof leg.fgaL3Avg === 'number'
            ? `FGA L3 ${leg.fgaL3Avg.toFixed(1)} keeps volume live.`
            : hitRate !== null
              ? `Recent form ${hitRate}/10 against this line.`
              : 'Deterministic board signal with limited sample context.';

        return {
          id: leg.id,
          headline: `${leg.player} · ${leg.market} ${leg.line}`,
          confidence,
          confidenceTone: confidence === 'Watchlist' ? 'warn' : 'good',
          rationale,
          context: `${leg.matchup} · ${leg.startTime} · ${leg.odds}`,
          leg
        };
      });
  }, [board]);

  const [recentlyChangedLegIds, setRecentlyChangedLegIds] = useState<Set<string>>(new Set());
  const [recentlyChangedGroups, setRecentlyChangedGroups] = useState<Set<string>>(new Set());
  const boardByIdRef = useRef(new Map<string, string>());

  useEffect(() => {
    const nextMap = new Map<string, string>();
    const changed = new Set<string>();
    const changedGroups = new Set<string>();

    board.forEach((leg) => {
      const fingerprint = [leg.player, leg.market, leg.line, leg.odds, leg.startTime, leg.matchup].join('|');
      nextMap.set(leg.id, fingerprint);
      const previous = boardByIdRef.current.get(leg.id);
      if ((previous && previous !== fingerprint) || (!previous && boardByIdRef.current.size > 0)) {
        changed.add(leg.id);
        changedGroups.add(`${leg.matchup} • ${leg.startTime}`);
      }
    });

    boardByIdRef.current = nextMap;

    if (changed.size === 0) return;

    setRecentlyChangedLegIds(changed);
    setRecentlyChangedGroups(changedGroups);

    const timer = window.setTimeout(() => {
      setRecentlyChangedLegIds(new Set());
      setRecentlyChangedGroups(new Set());
    }, 2_000);

    return () => window.clearTimeout(timer);
  }, [board, boardUpdateTick]);

  const slipIds = useMemo(() => new Set(slip.map((leg) => leg.id)), [slip]);
  const legCount = slip.length;
  const stressEnabled = legCount >= 2;

  const closeOverlays = useCallback(() => {
    setUi((prev) => ({ ...prev, navDrawerOpen: false, slipSheetOpen: false, pasteModalOpen: false, saveModalOpen: false, accountOpen: false, tzOpen: false }));
  }, []);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverlays();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [closeOverlays]);

  useEffect(() => {
    if (ui.pasteModalOpen) pasteInputRef.current?.focus();
  }, [ui.pasteModalOpen]);

  useEffect(() => {
    if (ui.saveModalOpen) saveInputRef.current?.focus();
  }, [ui.saveModalOpen]);

  useEffect(() => {
    if (!ticketHeaderPulse) return;
    const timer = window.setTimeout(() => setTicketHeaderPulse(false), 550);
    return () => window.clearTimeout(timer);
  }, [ticketHeaderPulse]);

  const onAdd = (leg: (typeof board)[number], triggerEl?: HTMLElement | null) => {
    if (slipIds.has(leg.id) || slip.length >= 6) return;
    addLeg({
      id: leg.id,
      player: leg.player,
      marketType: toMarketType(leg.market),
      line: leg.line,
      odds: leg.odds,
      game: leg.matchup
    });
    setTicketHeaderPulse(true);
    setPulseToken((v) => v + 1);
    const target = ticketBadgeRef.current ?? mobileTicketCtaRef.current;
    flyToTicket({ from: triggerEl ?? null, to: target ?? null });
  };

  const onRemove = (id: string) => {
    removeLeg(id);
    setPulseToken((v) => v + 1);
  };

  const onAnalyzeLeg = async (leg: (typeof board)[number], triggerEl?: HTMLElement | null) => {
    const alreadyAdded = slipIds.has(leg.id);
    if (!alreadyAdded) {
      onAdd(leg, triggerEl);
    }

    const nextCount = alreadyAdded ? slip.length : slip.length + 1;
    const ticketPanel = document.getElementById('ticket-panel');
    if (ticketPanel && typeof ticketPanel.scrollIntoView === 'function') {
      ticketPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (nextCount >= 2) {
      await runStressTest();
    }
  };

  const onEditLeg = (id: string, field: 'line' | 'odds', value: string) => {
    const existing = slip.find((leg) => leg.id === id);
    if (!existing) return;
    updateLeg({ ...existing, [field]: value });
  };

  const compactLine = useMemo(() => {
    const structure = buildSlipStructureReport(slip.map((leg) => ({
      id: leg.id,
      player: leg.player,
      market: leg.marketType,
      line: leg.line,
      odds: leg.odds,
      game: leg.game
    })));
    if (structure.legs.length === 0) return { hitEstimate: '—', breakEven: '—', gap: '—' };
    const avgFragility = structure.legs.reduce((sum, leg) => sum + (leg.fragility_score ?? 50), 0) / structure.legs.length;
    const hitEstimateValue = Math.max(5, Math.min(95, Math.round(100 - avgFragility)));
    const breakEvenValue = 52;
    const gapValue = hitEstimateValue - breakEvenValue;
    const hitEstimate = `${hitEstimateValue}%`;
    const breakEven = `${breakEvenValue}%`;
    const gap = `${gapValue > 0 ? '+' : ''}${gapValue}%`;
    return { hitEstimate, breakEven, gap };
  }, [slip]);

  const { statusText } = useRunEvents(analysis.traceId ?? nervous.trace_id);

  const runStressTest = async () => {
    if (!stressEnabled || analysis.running) return;
    setPulseToken((v) => v + 1);
    const ensured = ensureTraceId({ sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode, trace_id: nervous.trace_id, tab: undefined });
    const traceId = ensured.trace_id;
    setAnalysis((prev) => ({ ...prev, running: true, stage: 'Analyze', traceId }));
    const shouldShowPhase = selectedMode !== 'live';
    if (shouldShowPhase) {
      setPhaseStep('Ingest');
      window.setTimeout(() => setPhaseStep('Normalize'), 110);
      window.setTimeout(() => setPhaseStep('Score'), 220);
      window.setTimeout(() => setPhaseStep('Verdict'), 330);
      window.setTimeout(() => setPhaseStep(null), 520);
    }
    router.replace(spineHref('/cockpit', nervous, { trace_id: traceId }));

    try {
      const response = await fetch('/api/run/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trace_id: traceId,
          spine: ensured.spine,
          legs: slip.map((leg) => ({
            player: leg.player,
            market: String(leg.marketType),
            line: String(leg.line),
            odds: String(leg.odds ?? '-110'),
            game_id: String(leg.game ?? leg.id)
          }))
        })
      });
      const payload = await response.json();
      const report = buildSlipStructureReport(slip.map((leg) => ({
        id: leg.id,
        player: leg.player,
        market: leg.marketType,
        line: leg.line,
        odds: leg.odds,
        game: leg.game
      })));

      const weakestLeg = report.legs.find((leg) => leg.player === payload?.analysis?.weakest_leg?.player) ?? report.legs.find((leg) => leg.leg_id === report.weakest_leg_id);
      const corrLabel = report.script_clusters.some((cluster) => cluster.severity === 'high') ? 'High' : report.script_clusters.some((cluster) => cluster.severity === 'med') ? 'Medium' : 'Low';
      const runDto = payload?.run;
      const runTraceId = typeof payload?.trace_id === 'string' ? payload.trace_id : traceId;
      const weakestFromRun = typeof runDto?.verdict?.weakest_leg_id === 'string'
        ? report.legs.find((leg) => leg.leg_id === runDto.verdict.weakest_leg_id)
        : undefined;

      setAnalysis({
        running: false,
        weakestId: weakestFromRun?.leg_id ?? weakestLeg?.leg_id ?? '',
        weakestLabel: weakestFromRun?.player ?? weakestLeg?.player ?? '—',
        traceId: runTraceId,
        corrLabel,
        fragility: typeof runDto?.verdict?.fragility_score === 'number'
          ? runDto.verdict.fragility_score
          : (typeof payload?.analysis?.fragility_score === 'number' ? payload.analysis.fragility_score : (typeof weakestLeg?.fragility_score === 'number' ? weakestLeg.fragility_score : null)),
        reasons: Array.isArray(runDto?.verdict?.reasons)
          ? runDto.verdict.reasons
          : (Array.isArray(payload?.analysis?.reasons) ? payload.analysis.reasons : report.reasons.slice(0, 2)),
        stage: 'Analyze',
        runProvenance: runDto?.provenance
      });
    } catch {
      setAnalysis((prev) => ({ ...prev, running: false, stage: 'Before', runProvenance: undefined }));
    }
  };

  const saveAnalysis = async () => {
    if (!analysis.traceId || !email.trim()) return;
    setSaveState('saving');
    await fetch('/api/analysis/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trace_id: analysis.traceId, contact: email.trim() })
    }).catch(() => null);
    setSaveState('saved');
    setTimeout(() => {
      setSaveState('idle');
      setUi((p) => ({ ...p, saveModalOpen: false }));
    }, 600);
  };

  return (
    <CockpitShell>
      <div className={`cockpit-page ${analysis.running ? 'running' : ''}`}>
        <CockpitHeader
          title="Tonight's Board"
          purpose="Scan active props, shape a ticket, then run deterministic stress diagnostics before lock."
          ctas={(
            <>
              <Button intent="primary" onClick={runStressTest} disabled={!stressEnabled || analysis.running}>Run analysis</Button>
              <Button intent="secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste slip</Button>
              <Link href={spineHref('/cockpit', nervous, { mode: 'demo', trace_id: analysis.traceId || nervous.trace_id })} className="ui-button ui-button-secondary focus-glow">Try sample</Link>
            </>
          )}
          strip={{
            mode: today.effective?.mode ?? today.mode,
            reason: today.effective?.reason ?? provenance.reason ?? today.reason,
            intentMode: today.intent?.mode ?? nervous.mode,
            updatedAt: provenance.generatedAt ?? today.generatedAt,
            providerSummary: {
              okCount: today.providerHealth?.filter((provider) => provider.ok).length ?? 0,
              total: today.providerHealth?.length ?? 0,
              degraded: Boolean(today.reason) || Boolean(today.providerHealth?.some((provider) => !provider.ok))
            },
            traceId: analysis.traceId || nervous.trace_id
          }}
        />

        <section className="terminal-hero" aria-label="Research terminal overview">
          <div className="terminal-hero-main">
            <p className="terminal-kicker">Bettor research terminal</p>
            <h1>Read tonight&apos;s board. Build a tighter slip.</h1>
            <p className="terminal-subcopy">
              Start with active props, move to deterministic stress diagnostics, and keep one truthful trace.
            </p>
            <div className="terminal-cta-row">
              <button className="ui-button ui-button-primary focus-glow" onClick={() => cockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Build from tonight&apos;s board</button>
              <button className="ui-button ui-button-secondary focus-glow" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste sample slip</button>
              <Link href={nervous.toHref('/track', { trace_id: analysis.traceId || nervous.trace_id, tab: 'during' })} className="ui-button ui-button-secondary focus-glow">Open latest run</Link>
            </div>
            <div className="terminal-evidence-row">
              <span className="terminal-evidence-chip">{previewStatusLabel}</span>
              <span className="terminal-evidence-chip">{neutralStatus}</span>
              <span className="terminal-evidence-chip">Slip confidence est. {compactLine.hitEstimate}</span>
              <span className="terminal-evidence-chip">Break-even gap {compactLine.gap}</span>
            </div>
          </div>
          <aside className="terminal-scout-panel" aria-label="Scout cards">
            <div className="terminal-scout-head">
              <h2>Scout cards</h2>
              <span>High signal from tonight&apos;s board</span>
            </div>
            {scoutSignals.length === 0 ? (
              <p className="terminal-empty">Board is loading. Demo/live state stays truthful and updates automatically.</p>
            ) : (
              <div className="terminal-scout-list">
                {scoutSignals.map((signal) => (
                  <button key={signal.id} className="terminal-scout-card" onClick={() => onOpenLeg(signal.leg)}>
                    <div>
                      <p>{signal.headline}</p>
                      <small>{signal.context}</small>
                    </div>
                    <div className="terminal-scout-meta">
                      <span>{signal.confidence}</span>
                      <span>{signal.rationale}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </section>

        <section id="cockpit" ref={cockpitRef} aria-label="Bettor cockpit: board and draft ticket" className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,1fr)] lg:items-start">
          <Panel id="board-panel" className="space-y-3">
            <PanelHeader
              title="Tonight's Board"
              subtitle={neutralStatus}
              action={(
                <div className="flex items-center gap-2">
                  <Button intent="secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste slip</Button>
                  <Button intent="secondary" onClick={() => cockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Build from tonight</Button>
                </div>
              )}
            />

            <div className="hero-controls">
              <div className="segmented" role="tablist" aria-label="Mode">
                <button className={`segment ${selectedMode === 'live' ? 'active' : ''}`} onClick={() => onSetMode('live')} aria-pressed={selectedMode === 'live'}>Live</button>
                <button className={`segment ${selectedMode === 'demo' ? 'active' : ''}`} onClick={() => onSetMode('demo')} aria-pressed={selectedMode === 'demo'}>Demo</button>
              </div>
              <div className="segmented" role="tablist" aria-label="Sport">
                {(['NBA', 'NFL'] as const).map((sport) => (
                  <button key={sport} className={`segment ${selectedSport === sport ? 'active' : ''}`} onClick={() => onSetSport(sport)} aria-pressed={selectedSport === sport}>{sport}</button>
                ))}
              </div>
            </div>

            <div className="search-wrap"><input type="search" className="search-input" placeholder="Search props…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search player props" /></div>
            <div className="board-list max-h-[68vh] overflow-y-auto pr-1" role="list">
              {Object.entries(groupedGames).map(([group, legs]) => (
                <div className="board-group" key={group}>
                  <div className="group-label">
                    {group}
                    {recentlyChangedGroups.has(group) ? <span className="group-updated">Updated</span> : null}
                  </div>
                  {legs.map((leg) => {
                    const added = slipIds.has(leg.id);
                    const confidence = confidenceSignal(leg);
                    const edge = edgeSignal(leg);
                    const fragility = fragilitySignal(leg);
                    return (
                      <div key={leg.id} className={`board-row ${recentlyChangedLegIds.has(leg.id) ? 'row-updated' : ''}`} role="listitem" onClick={() => onOpenLeg(leg)}>
                        <div className="board-row-body">
                          <div className="board-row-signal">
                            <div className="board-row-priority-line">
                              <div className="board-main">{leg.player} • {leg.market} {leg.line}</div>
                              <div className="board-priority-metrics">
                                <LandingChip className="board-priority-chip board-priority-odds">{leg.odds}</LandingChip>
                                <LandingChip variant={confidence.variant} className="board-priority-chip">{confidence.label}</LandingChip>
                                {edge ? <LandingChip variant={edge.variant} className="board-priority-chip">{edge.label}</LandingChip> : null}
                                <LandingChip variant={fragility.variant} className="board-priority-chip">{fragility.label}</LandingChip>
                              </div>
                            </div>
                            <div className="board-sub">{leg.matchup} · {leg.startTime}</div>
                            <AttemptsChips leg={leg} />
                            <div className="board-evidence-stack">
                              {typeof leg.marketImpliedProb === 'number' && typeof leg.modelProb === 'number' ? <LandingChip>Model {formatPct(leg.modelProb)} vs Implied {formatPct(leg.marketImpliedProb)}</LandingChip> : null}
                              {typeof leg.hitRateL10 === 'number' ? <LandingChip>L10 {leg.hitRateL10}/10</LandingChip> : null}
                              {bestContextCue(leg) ? <LandingChip>{bestContextCue(leg)}</LandingChip> : null}
                              <LandingChip>{confidenceLabel(leg)}</LandingChip>
                              {leg.deadLegRisk ? <LandingChip>Fragility: {fragilityLabel(leg)}</LandingChip> : null}
                            </div>
                            {leg.deadLegRisk || leg.roleReasons?.[0] || leg.deadLegReasons?.[0] || leg.rationale?.[0] ? (
                              <p className="board-note">
                                {leg.deadLegReasons?.[0] ?? leg.roleReasons?.[0] ?? leg.rationale?.[0] ?? fragilityLabel(leg)}
                              </p>
                            ) : null}
                          </div>
                          <div className="board-meta">
                            <LandingChip>Odds {leg.odds}</LandingChip>
                            <div className="board-actions">
                              <button className="board-open" onClick={(event) => { event.stopPropagation(); onOpenLeg(leg); }}>Open game</button>
                              <button className="board-open" onClick={(event) => { event.stopPropagation(); void onAnalyzeLeg(leg, event.currentTarget); }}>Analyze</button>
                              <button className={`add-btn ${added ? 'added' : ''}`} onClick={(event) => { event.stopPropagation(); onAdd(leg, event.currentTarget); }} disabled={added} aria-pressed={added}>{added ? 'Added' : 'Add'}</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="desktop-ticket-panel space-y-3 lg:sticky lg:top-3" id="ticket-panel">
            <PanelHeader
              title="Draft Ticket"
              subtitle={analysis.traceId ? statusText : 'Ready to run'}
              action={<span ref={ticketBadgeRef} className="leg-count-badge" aria-live="polite">{legCount} {legCount === 1 ? 'leg' : 'legs'}</span>}
            />

            <div className="ticket-body">
              {legCount === 0 ? (
                <div className="ticket-empty"><div className="ticket-empty-icon">⬡</div><div className="ticket-empty-text">No legs yet — add 2–4 from Tonight&apos;s Board to pressure-test your ticket.</div><TicketEmptyCoach sampleHref={spineHref('/cockpit', nervous, { mode: 'demo', trace_id: analysis.traceId || nervous.trace_id })} /></div>
              ) : (
                <div className="ticket-legs" role="list">
                  {slip.map((leg) => (
                    <div key={leg.id} className={`ticket-leg ${analysis.weakestId === leg.id ? 'weakest target-lock heat' : ''}`}>
                      <div>
                        <div className="ticket-leg-main">{leg.player} · {leg.marketType} {leg.line}</div>
                        <div className="ticket-leg-sub">{leg.game ?? '—'}</div>
                      </div>
                      <button className="remove-btn" onClick={() => onRemove(leg.id)} aria-label={`Remove ${leg.player}`}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <SlipIntelBar
                legs={slip.map((leg) => ({ id: leg.id, player: leg.player, marketType: leg.marketType, line: leg.line, odds: leg.odds, game: leg.game }))}
                className="mt-3"
              />

              <div className="moat-block">
                <div className="moat-row"><span>Weakest leg</span><span>{analysis.weakestLabel}</span></div>
                <div className="moat-row"><span>Correlation pressure</span><span>{analysis.corrLabel}</span></div>
                <div className="moat-row"><span>Fragility index</span><span>{analysis.fragility ?? '—'}</span></div>
              </div>
              {analysis.reasons.length > 0 ? <p className="board-sub">{analysis.reasons.join(' · ')}</p> : null}
              {analysis.traceId && analysis.stage !== 'Before' && !analysis.running ? (
                <RunIntegrityPanel
                  traceId={analysis.traceId}
                  runProvenance={analysis.runProvenance}
                  boardProvenance={provenance}
                  traceHref={nervous.toHref(`/traces/${encodeURIComponent(analysis.traceId)}`)}
                />
              ) : null}
            </div>

            <div className="ticket-cta-row">
              <Button intent="primary" onClick={runStressTest} disabled={!stressEnabled || analysis.running}>Run analysis</Button>
              <Button intent="secondary" onClick={() => setUi((p) => ({ ...p, saveModalOpen: true }))}>Save analysis</Button>
            </div>
            {phaseStep ? <p className="phase-strip" data-testid="phase-strip">{`Phase: ${phaseStep}`}</p> : null}
            {analysis.traceId ? <Link href={nervous.toHref('/track', { trace_id: analysis.traceId, tab: 'during' })} className="ui-button ui-button-secondary focus-glow" style={{ marginTop: 10, display: 'inline-block' }}>Continue to track</Link> : null}
          </Panel>
        </section>



        <details className="rounded-2xl border border-white/10 bg-slate-950/50 p-3" data-testid="cockpit-details-disclosure">
          <summary className="cursor-pointer text-sm text-slate-200">Details and diagnostics</summary>
          <div className="mt-3 space-y-3">
            <PreviewStrip
              rows={board}
              statusLabel={previewStatusLabel}
              buildHref={spineHref('/today', nervous, { trace_id: analysis.traceId || nervous.trace_id })}
              pasteHref={spineHref('/ingest', nervous, { trace_id: analysis.traceId || nervous.trace_id })}
              onPaste={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}
            />
            <LiveCredibilityStrip
              provenance={provenance}
              today={today}
              strictLiveUnavailable={strictLiveUnavailable}
              boardUpdateTick={boardUpdateTick}
              onRefresh={refreshToday}
              pulseToken={pulseToken}
            />
          </div>
        </details>

        <section className="how-it-works" aria-label="Connected bettor workflow">
          <article>
            <h3>Tonight&apos;s board</h3>
            <ul>
              <li>Scan odds, attempts context, and player-market edges quickly.</li>
              <li>Move straight from board rows into your working slip.</li>
            </ul>
            <Link href={spineHref('/today', nervous, { trace_id: analysis.traceId || nervous.trace_id })}>Open</Link>
          </article>
          <article>
            <h3>Stress test</h3>
            <ul>
              <li>Run deterministic fragility and correlation diagnostics.</li>
              <li>See weakest-leg risk and confidence pressure before lock.</li>
            </ul>
            <Link href={spineHref('/stress-test', nervous, { trace_id: analysis.traceId || nervous.trace_id, tab: 'analyze' })}>Open</Link>
          </article>
          <article>
            <h3>Track outcomes</h3>
            <ul>
              <li>Carry one trace from board → slip → run → outcome review.</li>
              <li>Keep evidence tied to the same decision path.</li>
            </ul>
            <Link href={spineHref('/track', nervous, { trace_id: analysis.traceId || nervous.trace_id, tab: 'during' })}>Open</Link>
          </article>
        </section>

        <section className="mobile-slip-bar" aria-label="Slip Bar" data-testid="mobile-slip-bar">
          <div>
            <p className="mobile-slip-count">{legCount} {legCount === 1 ? 'leg' : 'legs'}</p>
            <p className="mobile-slip-line">Hit est {compactLine.hitEstimate} · Break-even {compactLine.breakEven} · Gap {compactLine.gap}</p>
          </div>
          <button ref={mobileTicketCtaRef} className="ui-button ui-button-primary focus-glow" onClick={() => setUi((p) => ({ ...p, slipSheetOpen: true }))}>Open slip</button>
        </section>

        <div
          className={`slip-sheet-overlay ${ui.slipSheetOpen ? 'open' : ''}`}
          onClick={() => setUi((p) => ({ ...p, slipSheetOpen: false }))}
          aria-hidden={!ui.slipSheetOpen}
        />
        <aside className={`slip-sheet ${ui.slipSheetOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Slip drawer" data-testid="slip-sheet">
          <div className="slip-sheet-head">
            <h2>Draft slip</h2>
            <button className="remove-btn" onClick={() => setUi((p) => ({ ...p, slipSheetOpen: false }))} aria-label="Close slip drawer">✕</button>
          </div>
          <div className="slip-sheet-body">
            {legCount === 0 ? (
              <div className="ticket-empty"><div className="ticket-empty-icon">⬡</div><div className="ticket-empty-text">0 legs loaded. Add 2–4 legs to isolate pressure.</div></div>
            ) : (
              <div className="ticket-legs" role="list">
                {slip.map((leg) => (
                  <div key={leg.id} className={`ticket-leg ${analysis.weakestId === leg.id ? 'weakest target-lock heat' : ''}`}>
                    <div>
                      <div className="ticket-leg-main">{leg.player} · {leg.marketType}</div>
                      <div className="ticket-leg-sub">{leg.game ?? '—'}</div>
                      <div className="sheet-edit-row">
                        <label>
                          <span>Line</span>
                          <input value={leg.line} onChange={(e) => onEditLeg(leg.id, 'line', e.target.value)} />
                        </label>
                        <label>
                          <span>Odds</span>
                          <input value={leg.odds ?? ''} onChange={(e) => onEditLeg(leg.id, 'odds', e.target.value)} />
                        </label>
                      </div>
                    </div>
                    <button className="remove-btn" onClick={() => onRemove(leg.id)} aria-label={`Remove ${leg.player}`}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="slip-sheet-actions">
            <Link href={nervous.toHref('/stress-test', { trace_id: analysis.traceId || nervous.trace_id })} className={`ui-button ui-button-primary focus-glow ${stressEnabled ? '' : 'disabled'}`} aria-disabled={!stressEnabled} onClick={(event) => { if (!stressEnabled) event.preventDefault(); }}>Run stress test</Link>
            <Link href={spineHref('/cockpit', nervous, { mode: 'demo' })} className="ui-button ui-button-secondary focus-glow">Try sample slip</Link>
          </div>
        </aside>

        <div className={`drawer-overlay ${ui.navDrawerOpen ? 'open' : ''}`} onClick={() => setUi((p) => ({ ...p, navDrawerOpen: false }))} />
        <aside id="drawer" className={ui.navDrawerOpen ? 'open' : ''} aria-hidden={!ui.navDrawerOpen}><button className="drawer-close" onClick={() => setUi((p) => ({ ...p, navDrawerOpen: false }))}>Close</button><nav><a href="#cockpit">Cockpit</a></nav></aside>

        <div className={`modal-overlay ${ui.pasteModalOpen ? 'open' : ''}`} onClick={(e) => e.currentTarget === e.target && setUi((p) => ({ ...p, pasteModalOpen: false }))}>
          <div className="modal"><h2>Paste Slip</h2><textarea ref={pasteInputRef} placeholder="Paste slips to ingest through submit + extract." /><button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: false }))}>Close</button></div>
        </div>

        <div className={`modal-overlay ${ui.saveModalOpen ? 'open' : ''}`} onClick={(e) => e.currentTarget === e.target && setUi((p) => ({ ...p, saveModalOpen: false }))}>
          <div className="modal"><h2>Save Analysis</h2><input ref={saveInputRef} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /><button className="btn-secondary" onClick={saveAnalysis} disabled={saveState === 'saving' || !email.trim()}>{saveState === 'saved' ? 'Saved' : 'Done'}</button></div>
        </div>
      </div>
    </CockpitShell>
  );
}
