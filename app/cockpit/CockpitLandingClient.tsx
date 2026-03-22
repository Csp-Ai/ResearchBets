'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { LiveCredibilityStrip } from '@/app/cockpit/components/LiveCredibilityStrip';
import { PreviewStrip } from '@/src/components/landing/PreviewStrip';
import { TicketEmptyCoach } from '@/src/components/landing/TicketEmptyCoach';
import { flyToTicket } from '@/src/components/landing/flyToTicket';
import { RunIntegrityPanel } from '@/app/cockpit/components/RunIntegrityPanel';
import { useCockpitToday } from '@/app/cockpit/hooks/useCockpitToday';
import type { CockpitBoardLeg } from '@/app/cockpit/adapters/todayToBoard';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { CockpitHeader } from '@/src/components/cockpit/CockpitHeader';
import { CockpitShell } from '@/src/components/cockpit/CockpitShell';
import { Panel, PanelHeader } from '@/src/components/landing/ui';
import { spineHref } from '@/src/core/nervous/spineNavigation';
import type { MarketType } from '@/src/core/markets/marketType';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import { formatSignedPct } from '@/src/core/markets/edgePrimitives';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { Button } from '@/src/components/ui/button';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { useRunEvents } from '@/src/core/events/useRunEvents';
import { ensureTraceId } from '@/src/core/trace/trace_id';
import type { ResearchProvenance } from '@/src/core/run/researchRunDTO';

import './cockpit.css';

type Stage = 'Before' | 'Analyze' | 'During' | 'After';

type ScoutSignal = {
  id: string;
  headline: string;
  note: string;
  context: string;
  leg: CockpitBoardLeg;
};

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

const confidenceSummary = (leg: CockpitBoardLeg) => {
  if (typeof leg.confidencePct === 'number') {
    const tone = leg.confidencePct >= 70 ? 'Strong' : leg.confidencePct >= 58 ? 'Solid' : 'Thin';
    return `${tone} confidence · ${Math.round(leg.confidencePct)}%`; 
  }
  if (typeof leg.hitRateL10 === 'number') {
    const tone = leg.hitRateL10 >= 7 ? 'Strong' : leg.hitRateL10 >= 6 ? 'Solid' : 'Thin';
    return `${tone} confidence · L10 ${leg.hitRateL10}/10`;
  }
  return 'Watchlist confidence';
};

const edgeSummary = (leg: CockpitBoardLeg) => {
  if (typeof leg.edgeDelta === 'number') {
    return `Edge ${formatSignedPct(leg.edgeDelta)}`;
  }
  return null;
};

const riskTag = (leg: CockpitBoardLeg) => {
  if (leg.deadLegRisk === 'high') return 'Fragility watch';
  if (leg.deadLegRisk === 'med') return 'Needs script';
  if (leg.riskTag === 'watch') return 'Higher variance';
  return null;
};

const boardNote = (leg: CockpitBoardLeg) => {
  return leg.deadLegReasons?.[0] ?? leg.roleReasons?.[0] ?? leg.rationale?.[0] ?? null;
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
  const [recentlyChangedLegIds, setRecentlyChangedLegIds] = useState<Set<string>>(new Set());
  const [recentlyChangedGroups, setRecentlyChangedGroups] = useState<Set<string>>(new Set());
  const boardByIdRef = useRef(new Map<string, string>());

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

  const scoutSignals = useMemo<ScoutSignal[]>(() => {
    return board
      .slice()
      .sort((a, b) => {
        const aHit = typeof a.hitRateL10 === 'number' ? a.hitRateL10 : 0;
        const bHit = typeof b.hitRateL10 === 'number' ? b.hitRateL10 : 0;
        if (bHit !== aHit) return bHit - aHit;
        if (a.riskTag === b.riskTag) return 0;
        return a.riskTag === 'stable' ? -1 : 1;
      })
      .slice(0, 4)
      .map((leg) => ({
        id: leg.id,
        headline: `${leg.player} · ${leg.market} ${leg.line}`,
        note: edgeSummary(leg) ?? confidenceSummary(leg),
        context: `${leg.matchup} · ${leg.startTime} · ${leg.odds}`,
        leg
      }));
  }, [board]);

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
  const diagnosticsReady = analysis.stage !== 'Before' || analysis.running;

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
    return {
      hitEstimate: `${hitEstimateValue}%`,
      breakEven: `${breakEvenValue}%`,
      gap: `${gapValue > 0 ? '+' : ''}${gapValue}%`
    };
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
          purpose="Scan the board, add 2–4 legs, then pressure-test the draft ticket before you decide."
          ctas={(
            <>
              <Button intent="primary" onClick={runStressTest} disabled={!stressEnabled || analysis.running}>Run analysis</Button>
              <Button intent="secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste slip</Button>
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

        <section className="cockpit-hero" aria-label="Tonight's board overview">
          <div className="cockpit-hero-copy">
            <p className="cockpit-hero-meta">{selectedSport} · {nervous.date} · {ui.tz}</p>
            <h1>Tonight&apos;s Board</h1>
            <p className="cockpit-hero-subcopy">Start with the board. Add 2–4 legs. Run analysis only when the draft ticket feels worth a decision.</p>
            <div className="cockpit-hero-actions">
              <button className="ui-button ui-button-primary focus-glow" onClick={() => cockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Build from board</button>
              <button className="ui-button ui-button-secondary focus-glow" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste slip</button>
            </div>
            <div className="cockpit-hero-flow" aria-label="Tonight workflow">
              <span>1. Scan board</span>
              <span>2. Add 2–4 legs</span>
              <span>3. Review draft ticket</span>
              <span>4. Run analysis</span>
              <span>5. Make decision</span>
            </div>
            {previewStatusLabel === 'Demo mode (live feeds off)' ? <p className="cockpit-mode-note">Demo mode (live feeds off)</p> : null}
          </div>
          <div className="cockpit-hero-controls">
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
        </section>

        <section id="cockpit" ref={cockpitRef} aria-label="Bettor cockpit: board and draft ticket" className="cockpit-workspace">
          <Panel id="board-panel" className="cockpit-board-panel">
            <PanelHeader
              title="Tonight's Board"
              subtitle={neutralStatus}
              action={<span className="board-count-meta">{board.length} looks</span>}
            />
            <div className="board-toolbar">
              <input type="search" className="search-input" placeholder="Search players or props" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search player props" />
            </div>
            <div className="board-list" role="list">
              {Object.entries(groupedGames).map(([group, legs]) => (
                <div className="board-group" key={group}>
                  <div className="group-label">
                    <span>{group}</span>
                    {recentlyChangedGroups.has(group) ? <span className="group-updated">Updated</span> : null}
                  </div>
                  {legs.map((leg) => {
                    const added = slipIds.has(leg.id);
                    const note = boardNote(leg) ?? confidenceSummary(leg);
                    const metaLine = [leg.odds, edgeSummary(leg), confidenceSummary(leg)].filter(Boolean).join(' · ');
                    const tag = riskTag(leg);

                    return (
                      <div key={leg.id} className={`board-row ${recentlyChangedLegIds.has(leg.id) ? 'row-updated' : ''} ${added ? 'is-added' : ''}`} role="listitem">
                        <button className="board-row-content" onClick={() => onOpenLeg(leg)}>
                          <div className="board-row-mainline">
                            <div>
                              <p className="board-main">{leg.player} · {leg.market} {leg.line}</p>
                              <p className="board-sub">{leg.matchup} · {leg.startTime}</p>
                            </div>
                            <span className="board-odds">{leg.odds}</span>
                          </div>
                          <p className="board-confidence-line">{metaLine}</p>
                          <div className="board-supporting-line">
                            <p className="board-note">{note}</p>
                            {tag ? <span className="board-tag">{tag}</span> : null}
                          </div>
                        </button>
                        <div className="board-actions">
                          <button className="board-text-action" onClick={() => onOpenLeg(leg)}>Open</button>
                          <button className="board-text-action" onClick={(event) => { event.stopPropagation(); void onAnalyzeLeg(leg, event.currentTarget); }}>Analyze</button>
                          <button className={`add-btn ${added ? 'added' : ''}`} onClick={(event) => { event.stopPropagation(); onAdd(leg, event.currentTarget); }} disabled={added} aria-pressed={added}>{added ? 'Added' : 'Add'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Panel>

          <Panel className={`desktop-ticket-panel cockpit-ticket-panel ${ticketHeaderPulse ? 'ticket-header-pulse' : ''}`} id="ticket-panel">
            <PanelHeader
              title="Draft Ticket"
              subtitle={legCount === 0 ? 'Add 2–4 legs to pressure test' : (analysis.traceId ? statusText : 'Ready to run')}
              action={<span ref={ticketBadgeRef} className="leg-count-badge" aria-live="polite">{legCount} {legCount === 1 ? 'leg' : 'legs'}</span>}
            />

            <div className="ticket-body">
              {legCount === 0 ? (
                <div className="ticket-empty">
                  <div className="ticket-empty-text">Add 2–4 legs to pressure test.</div>
                  <p className="ticket-empty-subcopy">Your draft ticket updates immediately as you build from the board.</p>
                  <TicketEmptyCoach sampleHref={spineHref('/cockpit', nervous, { mode: 'demo', trace_id: analysis.traceId || nervous.trace_id })} />
                </div>
              ) : (
                <div className="ticket-legs" role="list">
                  {slip.map((leg) => (
                    <div key={leg.id} className={`ticket-leg ${analysis.weakestId === leg.id ? 'weakest target-lock heat' : ''}`}>
                      <div>
                        <div className="ticket-leg-main">{leg.player} · {leg.marketType} {leg.line}</div>
                        <div className="ticket-leg-sub">{leg.game ?? '—'} · {leg.odds}</div>
                      </div>
                      <button className="remove-btn" onClick={() => onRemove(leg.id)} aria-label={`Remove ${leg.player}`}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {legCount >= 2 ? (
                <>
                  <SlipIntelBar
                    legs={slip.map((leg) => ({ id: leg.id, player: leg.player, marketType: leg.marketType, line: leg.line, odds: leg.odds, game: leg.game }))}
                    className="ticket-intel"
                  />
                  <div className="ticket-summary-grid">
                    <div className="ticket-summary-item"><span>Weakest leg</span><strong>{analysis.weakestLabel}</strong></div>
                    <div className="ticket-summary-item"><span>Correlation pressure</span><strong>{analysis.corrLabel}</strong></div>
                    <div className="ticket-summary-item"><span>Fragility index</span><strong>{analysis.fragility ?? '—'}</strong></div>
                  </div>
                </>
              ) : null}

              {analysis.reasons.length > 0 ? <p className="ticket-reasons">{analysis.reasons.join(' · ')}</p> : null}
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
            {analysis.traceId && analysis.stage !== 'Before' ? <Link href={nervous.toHref('/track', { trace_id: analysis.traceId, tab: 'during' })} className="ui-button ui-button-secondary focus-glow ticket-track-link">Continue to track</Link> : null}
          </Panel>
        </section>

        <section className="signals-section" aria-label="Signals">
          <div className="signals-head">
            <h2>Signals</h2>
            <p>Best looks from tonight&apos;s board.</p>
          </div>
          {scoutSignals.length === 0 ? (
            <p className="signals-empty">Board is loading. Signals will appear as looks settle in.</p>
          ) : (
            <div className="signals-grid">
              {scoutSignals.map((signal) => (
                <button key={signal.id} className="signal-card" onClick={() => onAnalyzeLeg(signal.leg)}>
                  <p className="signal-card-title">{signal.headline}</p>
                  <p className="signal-card-note">{signal.note}</p>
                  <span className="signal-card-context">{signal.context}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <details className="diagnostics-disclosure" data-testid="cockpit-details-disclosure">
          <summary>{diagnosticsReady ? 'Show system details' : 'Show system details after analysis'}</summary>
          {diagnosticsReady ? (
            <div className="diagnostics-content">
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
          ) : null}
        </details>

        <section className="mobile-slip-bar" aria-label="Slip Bar" data-testid="mobile-slip-bar">
          <div>
            <p className="mobile-slip-count">Draft Ticket · {legCount} {legCount === 1 ? 'leg' : 'legs'}</p>
            <p className="mobile-slip-line">Add 2–4 legs, then run analysis.</p>
          </div>
          <button ref={mobileTicketCtaRef} className="ui-button ui-button-primary focus-glow" onClick={() => setUi((p) => ({ ...p, slipSheetOpen: true }))}>Open Draft Ticket</button>
        </section>

        <div className={`slip-sheet-overlay ${ui.slipSheetOpen ? 'open' : ''}`} onClick={() => setUi((p) => ({ ...p, slipSheetOpen: false }))} aria-hidden={!ui.slipSheetOpen} />
        <aside className={`slip-sheet ${ui.slipSheetOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Slip drawer" data-testid="slip-sheet">
          <div className="slip-sheet-head">
            <h2>Draft Ticket</h2>
            <button className="remove-btn" onClick={() => setUi((p) => ({ ...p, slipSheetOpen: false }))} aria-label="Close slip drawer">✕</button>
          </div>
          <div className="slip-sheet-body">
            {legCount === 0 ? (
              <div className="ticket-empty"><div className="ticket-empty-text">Add 2–4 legs to pressure test.</div></div>
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
            <button className={`ui-button ui-button-primary focus-glow ${stressEnabled ? '' : 'disabled'}`} aria-disabled={!stressEnabled} onClick={() => { if (stressEnabled) void runStressTest(); }}>Run analysis</button>
            <Link href={spineHref('/cockpit', nervous, { mode: 'demo' })} className="ui-button ui-button-secondary focus-glow">Try sample slip</Link>
          </div>
        </aside>

        <div className={`drawer-overlay ${ui.navDrawerOpen ? 'open' : ''}`} onClick={() => setUi((p) => ({ ...p, navDrawerOpen: false }))} />
        <aside id="drawer" className={ui.navDrawerOpen ? 'open' : ''} aria-hidden={!ui.navDrawerOpen}><button className="drawer-close" onClick={() => setUi((p) => ({ ...p, navDrawerOpen: false }))}>Close</button><nav><a href="#cockpit">Cockpit</a></nav></aside>

        <div className={`modal-overlay ${ui.pasteModalOpen ? 'open' : ''}`} onClick={(e) => e.currentTarget === e.target && setUi((p) => ({ ...p, pasteModalOpen: false }))}>
          <div className="modal"><h2>Paste slip</h2><textarea ref={pasteInputRef} placeholder="Paste slips to ingest through submit + extract." /><button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: false }))}>Close</button></div>
        </div>

        <div className={`modal-overlay ${ui.saveModalOpen ? 'open' : ''}`} onClick={(e) => e.currentTarget === e.target && setUi((p) => ({ ...p, saveModalOpen: false }))}>
          <div className="modal"><h2>Save analysis</h2><input ref={saveInputRef} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /><button className="btn-secondary" onClick={saveAnalysis} disabled={saveState === 'saving' || !email.trim()}>{saveState === 'saved' ? 'Saved' : 'Done'}</button></div>
        </div>
      </div>
    </CockpitShell>
  );
}
