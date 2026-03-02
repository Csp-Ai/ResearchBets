'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { LiveCredibilityStrip } from '@/app/cockpit/components/LiveCredibilityStrip';
import { RunIntegrityPanel } from '@/app/cockpit/components/RunIntegrityPanel';
import { useCockpitToday } from '@/app/cockpit/hooks/useCockpitToday';
import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { MarketType } from '@/src/core/markets/marketType';
import { buildSlipStructureReport } from '@/src/core/slips/slipIntelligence';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { useRunEvents } from '@/src/core/events/useRunEvents';
import { ensureTraceId } from '@/src/core/trace/trace_id';
import type { ResearchProvenance } from '@/src/core/run/researchRunDTO';

import './cockpit.css';

const ACCORDIONS = [
  { id: 'what', title: 'What this engine flags', content: 'Correlation pressure, fragility concentration, and weakest-leg breakdown in a deterministic simulation pass.' },
  { id: 'how', title: 'How simulation works', content: 'Stress test stages move through Before → Analyze → During → After with run continuity on trace_id.' },
  { id: 'limits', title: 'Mode limitations', content: 'Live endpoints can degrade to cache/demo while keeping board and ticket usable.' }
];

type Stage = 'Before' | 'Analyze' | 'During' | 'After';

const COCKPIT_MARKETS: MarketType[] = ['spread', 'total', 'moneyline', 'ra', 'points', 'threes', 'rebounds', 'assists', 'pra'];
const toMarketType = (market: string): MarketType => {
  const normalized = market.toLowerCase();
  return (COCKPIT_MARKETS.includes(normalized as MarketType) ? normalized : 'points') as MarketType;
};

export default function CockpitLandingClient() {
  const cockpitRef = useRef<HTMLElement | null>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const saveInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const nervous = useNervousSystem();
  const [selectedSport, setSelectedSport] = useState<'NBA' | 'NFL'>(() => (nervous.sport === 'NFL' ? 'NFL' : 'NBA'));
  const [selectedMode, setSelectedMode] = useState<'live' | 'demo'>(() => (nervous.mode === 'demo' ? 'demo' : 'live'));
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
  const [ui, setUi] = useState({
    navDrawerOpen: false,
    slipSheetOpen: false,
    pasteModalOpen: false,
    saveModalOpen: false,
    accountOpen: false,
    tzOpen: false,
    tz: 'ET',
    openAccordionIds: new Set<string>()
  });


  const onSetMode = (mode: 'live' | 'demo') => {
    setSelectedMode(mode);
    const href = nervous.toHref(pathname || '/cockpit', { mode });
    router.replace(href);
  };

  const onSetSport = (sport: 'NBA' | 'NFL') => {
    setSelectedSport(sport);
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

  const onAdd = (leg: (typeof board)[number]) => {
    if (slipIds.has(leg.id) || slip.length >= 6) return;
    addLeg({
      id: leg.id,
      player: leg.player,
      marketType: toMarketType(leg.market),
      line: leg.line,
      odds: leg.odds,
      game: leg.matchup
    });
  };

  const onRemove = (id: string) => removeLeg(id);

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

  const toggleAccordion = (id: string) => {
    setUi((prev) => {
      const next = new Set(prev.openAccordionIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, openAccordionIds: next };
    });
  };

  const { latestStage, statusText } = useRunEvents(analysis.traceId ?? nervous.trace_id);

  const runStressTest = async () => {
    if (!stressEnabled || analysis.running) return;
    const ensured = ensureTraceId({ sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode, trace_id: nervous.trace_id, tab: undefined });
    const traceId = ensured.trace_id;
    setAnalysis((prev) => ({ ...prev, running: true, stage: 'Analyze', traceId }));
    router.replace(appendQuery(nervous.toHref('/cockpit'), { trace_id: traceId }));

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
    <div className={`cockpit-page ${analysis.running ? 'running' : ''}`}>
      <header id="topbar" role="banner">
        <div className="wordmark">RESEARCH<span>BETS</span></div>
        <div className="topbar-chips"><span className="boards-label">{neutralStatus}</span></div>
        <div className="topbar-right">
          <div className="tz-shell">
            <button className="chip active tz-btn" aria-expanded={ui.tzOpen} onClick={() => setUi((p) => ({ ...p, tzOpen: !p.tzOpen }))}>TZ: {ui.tz} ▾</button>
            {ui.tzOpen && (
              <div className="tz-dropdown open" role="listbox">
                {['ET', 'CT', 'MT', 'PT'].map((tz) => (
                  <button key={tz} className={`tz-option ${ui.tz === tz ? 'active' : ''}`} role="option" aria-selected={ui.tz === tz} onClick={() => setUi((p) => ({ ...p, tz, tzOpen: false }))}>{tz}</button>
                ))}
              </div>
            )}
          </div>
          <button className="hamburger" aria-label="Open navigation menu" aria-expanded={ui.navDrawerOpen} onClick={() => setUi((p) => ({ ...p, navDrawerOpen: !p.navDrawerOpen }))}><span /><span /><span /></button>
        </div>
      </header>

      <section id="hero" aria-labelledby="hero-headline">
        <h1 className="hero-headline" id="hero-headline">One leg breaks.<br /><span className="hero-headline-accent">Find it first.</span></h1>
        <p className="hero-sub">Most slips don&apos;t fail randomly. They fail predictably. Isolate the pressure point before you submit.</p>
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
        <div className="cta-row">
          <button className="btn-primary" onClick={() => cockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Build from Tonight</button>
          <button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste Slip</button>
        </div>
      </section>

      <section id="cockpit" ref={cockpitRef} aria-label="Bettor cockpit: board and draft ticket">
        <LiveCredibilityStrip
          provenance={provenance}
          today={today}
          strictLiveUnavailable={strictLiveUnavailable}
          boardUpdateTick={boardUpdateTick}
          onRefresh={refreshToday}
        />
        <div className="panel" id="board-panel">
          <div className="panel-header"><span className="panel-title">Tonight&apos;s Board</span></div>
          <div className="search-wrap"><input type="search" className="search-input" placeholder="Search props…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search player props" /></div>
          <div className="board-list" role="list">
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
                      </div>
                      <div className="board-meta">
                        <span className="board-chip">Odds {leg.odds}</span>
                        <span className="board-chip">L10 {leg.hitRateL10 ?? '—'}/10</span>
                        <span className="board-open">Open ›</span>
                        <button className={`add-btn ${added ? 'added' : ''}`} onClick={(event) => { event.stopPropagation(); onAdd(leg); }} disabled={added} aria-pressed={added}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="panel desktop-ticket-panel" id="ticket-panel">
          <div id="ticket-scan-sweep" />
          <div className="panel-header">
            <span className="panel-title">Draft Ticket</span>
            <span className="leg-count-badge" aria-live="polite">{legCount} {legCount === 1 ? 'leg' : 'legs'}</span>
          </div>

          <section className="pipeline-strip ticket-pipeline" aria-label="Run trace strip">
            <span id="trace-chip">{analysis.traceId || 'trace pending'}</span>
            <div className="stage-row">
              {(['Before', 'Analyze', 'During', 'After'] as Stage[]).map((stage) => {
                const active = (stage === 'Before' && latestStage === 'created')
                  || (stage === 'Analyze' && (latestStage === 'analyzing' || latestStage === 'ready'))
                  || (stage === 'During' && latestStage === 'complete')
                  || (stage === 'After' && latestStage === 'complete');
                return <div key={stage} className={`stage ${active ? 'active' : ''}`}>{stage}{stage === 'During' || stage === 'After' ? ' (preview)' : ''}</div>;
              })}
            </div>
          </section>
          <div className="ticket-body">
            {legCount === 0 ? (
              <div className="ticket-empty"><div className="ticket-empty-icon">⬡</div><div className="ticket-empty-text">0 legs loaded. Add 2–4 legs to isolate pressure.</div></div>
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

            <div className="moat-block">
              <div className="moat-row"><span>Weakest leg</span><span>{analysis.weakestLabel}</span></div>
              <div className="moat-row"><span>Correlation pressure</span><span>{analysis.corrLabel}</span></div>
              <div className="moat-row"><span>Fragility index</span><span>{analysis.fragility ?? '—'}</span></div>
            </div>
            {analysis.reasons.length > 0 ? <p className="board-sub">{analysis.reasons.join(' · ')}</p> : null}
            {analysis.traceId ? <p className="board-sub">{statusText}</p> : null}
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
            <button className={`btn-primary ${stressEnabled ? '' : 'disabled'}`} onClick={runStressTest} disabled={!stressEnabled || analysis.running}>Run stress test</button>
            <button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, saveModalOpen: true }))}>Save Analysis</button>
          </div>
          {analysis.traceId ? <Link href={nervous.toHref('/track', { trace_id: analysis.traceId, tab: 'during' })} className="btn-primary" style={{ marginTop: 10, display: 'inline-block' }}>Continue to Track</Link> : null}
        </div>
      </section>


      <section className="accordions" aria-label="Cockpit details">
        {ACCORDIONS.map((item) => {
          const open = ui.openAccordionIds.has(item.id);
          return (<article className={`accordion ${open ? 'open' : ''}`} key={item.id}><button className="accordion-trigger" aria-expanded={open} onClick={() => toggleAccordion(item.id)}>{item.title}</button>{open && <div className="accordion-content">{item.content}</div>}</article>);
        })}
      </section>

      <footer className="cockpit-footer"><button className="btn-primary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste Slip</button></footer>

      <section className="mobile-slip-bar" aria-label="Slip Bar" data-testid="mobile-slip-bar">
        <div>
          <p className="mobile-slip-count">{legCount} {legCount === 1 ? 'leg' : 'legs'}</p>
          <p className="mobile-slip-line">Hit est {compactLine.hitEstimate} · Break-even {compactLine.breakEven} · Gap {compactLine.gap}</p>
        </div>
        <button className="btn-primary" onClick={() => setUi((p) => ({ ...p, slipSheetOpen: true }))}>Open slip</button>
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
          <Link href={nervous.toHref('/stress-test', { trace_id: analysis.traceId || nervous.trace_id })} className={`btn-primary ${stressEnabled ? '' : 'disabled'}`} aria-disabled={!stressEnabled} onClick={(event) => { if (!stressEnabled) event.preventDefault(); }}>Run stress test</Link>
          <Link href={appendQuery(nervous.toHref('/cockpit'), { mode: 'demo' })} className="btn-secondary">Try sample slip</Link>
        </div>
      </aside>

      <div className={`drawer-overlay ${ui.navDrawerOpen ? 'open' : ''}`} onClick={() => setUi((p) => ({ ...p, navDrawerOpen: false }))} />
      <aside id="drawer" className={ui.navDrawerOpen ? 'open' : ''} aria-hidden={!ui.navDrawerOpen}><button className="drawer-close" onClick={() => setUi((p) => ({ ...p, navDrawerOpen: false }))}>Close</button><nav><a href="#hero">Hero</a><a href="#cockpit">Cockpit</a></nav></aside>

      <div className={`modal-overlay ${ui.pasteModalOpen ? 'open' : ''}`} onClick={(e) => e.currentTarget === e.target && setUi((p) => ({ ...p, pasteModalOpen: false }))}>
        <div className="modal"><h2>Paste Slip</h2><textarea ref={pasteInputRef} placeholder="Paste slips to ingest through submit + extract." /><button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: false }))}>Close</button></div>
      </div>

      <div className={`modal-overlay ${ui.saveModalOpen ? 'open' : ''}`} onClick={(e) => e.currentTarget === e.target && setUi((p) => ({ ...p, saveModalOpen: false }))}>
        <div className="modal"><h2>Save Analysis</h2><input ref={saveInputRef} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /><button className="btn-secondary" onClick={saveAnalysis} disabled={saveState === 'saving' || !email.trim()}>{saveState === 'saved' ? 'Saved' : 'Done'}</button></div>
      </div>
    </div>
  );
}
