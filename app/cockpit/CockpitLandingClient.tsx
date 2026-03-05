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
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { CockpitHeader } from '@/src/components/cockpit/CockpitHeader';
import { CockpitShell } from '@/src/components/cockpit/CockpitShell';
import { Chip as LandingChip, Panel, PanelHeader } from '@/src/components/landing/ui';
import { spineHref } from '@/src/core/nervous/spineNavigation';
import type { MarketType } from '@/src/core/markets/marketType';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
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
            mode: today.mode,
            reason: provenance.reason ?? today.reason,
            updatedAt: provenance.generatedAt ?? today.generatedAt,
            providerSummary: {
              okCount: today.providerHealth?.filter((provider) => provider.ok).length ?? 0,
              total: today.providerHealth?.length ?? 0,
              degraded: Boolean(today.reason) || Boolean(today.providerHealth?.some((provider) => !provider.ok))
            },
            traceId: analysis.traceId || nervous.trace_id
          }}
        />

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
                    return (
                      <div key={leg.id} className={`board-row ${recentlyChangedLegIds.has(leg.id) ? 'row-updated' : ''}`} role="listitem" onClick={() => onOpenLeg(leg)}>
                        <div>
                          <div className="board-main">{leg.player} • {leg.market} {leg.line}</div>
                          <div className="board-sub">{leg.matchup} · {leg.startTime}</div>
                          <AttemptsChips leg={leg} />
                        </div>
                        <div className="board-meta">
                          <LandingChip>Odds {leg.odds}</LandingChip>
                          <LandingChip>L10 {leg.hitRateL10 ?? '—'}/10</LandingChip>
                          <span className="board-open">Open ›</span>
                          <button className={`add-btn ${added ? 'added' : ''}`} onClick={(event) => { event.stopPropagation(); onAdd(leg, event.currentTarget); }} disabled={added} aria-pressed={added}>+</button>
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
                <div className="ticket-empty"><div className="ticket-empty-icon">⬡</div><div className="ticket-empty-text">0 legs loaded.</div><TicketEmptyCoach sampleHref={spineHref('/cockpit', nervous, { mode: 'demo', trace_id: analysis.traceId || nervous.trace_id })} /></div>
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

        <section className="how-it-works" aria-label="How it works">
          <article>
            <h3>Tonight&apos;s Board</h3>
            <ul>
              <li>Scan active props with odds and recent attempts context.</li>
              <li>Add candidate legs directly into the draft ticket.</li>
            </ul>
            <Link href={spineHref('/today', nervous, { trace_id: analysis.traceId || nervous.trace_id })}>Open</Link>
          </article>
          <article>
            <h3>Stress Test</h3>
            <ul>
              <li>Run deterministic fragility + correlation diagnostics.</li>
              <li>Expose the weakest leg before lock.</li>
            </ul>
            <Link href={spineHref('/stress-test', nervous, { trace_id: analysis.traceId || nervous.trace_id, tab: 'analyze' })}>Open</Link>
          </article>
          <article>
            <h3>Track Outcomes</h3>
            <ul>
              <li>Follow run continuity by trace_id.</li>
              <li>Review outcome events and postmortem-ready notes.</li>
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
