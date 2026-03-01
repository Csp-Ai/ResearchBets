'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import './cockpit.css';

type Risk = 'danger' | 'watch' | 'stable';

type BoardLeg = {
  id: string;
  league: 'NBA' | 'NFL' | 'NHL';
  game: string;
  player: string;
  market: string;
  line: string;
  odds: string;
  l10: number;
  risk: Risk;
};

const BOARD_DATA: BoardLeg[] = [
  { id: 'nba-1', league: 'NBA', game: 'LAL @ BOS', player: 'J. Tatum', market: 'Points', line: 'O 28.5', odds: '-110', l10: 8, risk: 'watch' },
  { id: 'nba-2', league: 'NBA', game: 'LAL @ BOS', player: 'L. James', market: 'Assists', line: 'O 8.5', odds: '-105', l10: 6, risk: 'stable' },
  { id: 'nba-3', league: 'NBA', game: 'PHX @ DEN', player: 'N. Jokic', market: 'Rebounds', line: 'O 12.5', odds: '-118', l10: 7, risk: 'danger' },
  { id: 'nfl-1', league: 'NFL', game: 'KC @ BUF', player: 'P. Mahomes', market: 'Pass Yds', line: 'O 289.5', odds: '-112', l10: 5, risk: 'watch' },
  { id: 'nfl-2', league: 'NFL', game: 'KC @ BUF', player: 'J. Allen', market: 'Rush Yds', line: 'O 39.5', odds: '-108', l10: 7, risk: 'stable' },
  { id: 'nhl-1', league: 'NHL', game: 'EDM @ VAN', player: 'C. McDavid', market: 'Shots', line: 'O 3.5', odds: '+105', l10: 6, risk: 'watch' },
  { id: 'nhl-2', league: 'NHL', game: 'NYR @ TOR', player: 'A. Matthews', market: 'Goals', line: 'O 0.5', odds: '+125', l10: 4, risk: 'danger' }
];

const ACCORDIONS = [
  { id: 'what', title: 'What this engine flags', content: 'Correlation pressure, fragility concentration, and weakest-leg breakdown in a deterministic simulation pass.' },
  { id: 'how', title: 'How simulation works', content: 'Board data remains local in this prototype port. Stress test stages move through Before → Analyze → During → After.' },
  { id: 'limits', title: 'Mode limitations', content: 'No backend wiring in this route yet. Results are deterministic and designed only to mirror prototype behavior.' }
];

const RISK_ORDER: Record<Risk, number> = { danger: 0, watch: 1, stable: 2 };

export default function CockpitLandingClient() {
  const cockpitRef = useRef<HTMLElement | null>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const saveInputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState('');
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [ticketLegs, setTicketLegs] = useState<BoardLeg[]>([]);
  const [stressState, setStressState] = useState({
    running: false,
    weakestId: '',
    traceId: 'trace_idle',
    corrLabel: '—',
    corrValue: 0,
    fragility: 0,
    stage: 'Before'
  });
  const [ui, setUi] = useState({
    drawerOpen: false,
    pasteModalOpen: false,
    saveModalOpen: false,
    accountOpen: false,
    tzOpen: false,
    tz: 'ET',
    openAccordionIds: new Set<string>(['what'])
  });

  const groupedGames = useMemo(() => {
    const filtered = BOARD_DATA.filter((leg) => {
      const hay = `${leg.league} ${leg.game} ${leg.player} ${leg.market}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });

    return filtered.reduce<Record<string, BoardLeg[]>>((acc, leg) => {
      const key = `${leg.league} • ${leg.game}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(leg);
      return acc;
    }, {});
  }, [query]);

  const legCount = ticketLegs.length;
  const stressEnabled = legCount >= 2;

  const closeOverlays = useCallback(() => {
    setUi((prev) => ({ ...prev, drawerOpen: false, pasteModalOpen: false, saveModalOpen: false, accountOpen: false, tzOpen: false }));
  }, []);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOverlays();
      }
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

  const onAdd = (leg: BoardLeg) => {
    if (addedIds.includes(leg.id) || ticketLegs.length >= 6) return;
    setAddedIds((prev) => [...prev, leg.id]);
    setTicketLegs((prev) => [...prev, leg]);
  };

  const onRemove = (id: string) => {
    setAddedIds((prev) => prev.filter((item) => item !== id));
    setTicketLegs((prev) => prev.filter((leg) => leg.id !== id));
  };

  const toggleAccordion = (id: string) => {
    setUi((prev) => {
      const next = new Set(prev.openAccordionIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, openAccordionIds: next };
    });
  };

  const runStressTest = () => {
    if (!stressEnabled || stressState.running) return;
    const sorted = [...ticketLegs].sort((a, b) => {
      const riskDiff = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
      if (riskDiff !== 0) return riskDiff;
      return a.l10 - b.l10;
    });
    const weakest = sorted[0];
    if (!weakest) return;
    const corrLabel = legCount >= 4 ? 'High' : legCount === 3 ? 'Medium' : 'Low';
    const corrTarget = corrLabel === 'High' ? 7.9 : corrLabel === 'Medium' ? 4.7 : 1.4;
    const fragilityTarget = legCount >= 4 ? 7.4 : legCount === 3 ? 5.8 : 3.2;
    const traceId = `trace_${Math.random().toString(36).slice(2, 8)}`;

    setStressState((prev) => ({ ...prev, running: true, weakestId: weakest.id, traceId, stage: 'Analyze', corrLabel }));

    const started = performance.now();
    const duration = 900;
    const frame = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setStressState((prev) => ({ ...prev, corrValue: Number((corrTarget * eased).toFixed(1)), fragility: Number((fragilityTarget * eased).toFixed(1)) }));
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    window.setTimeout(() => setStressState((prev) => ({ ...prev, stage: 'Before' })), 120);
    window.setTimeout(() => setStressState((prev) => ({ ...prev, stage: 'Analyze' })), 520);
    window.setTimeout(() => setStressState((prev) => ({ ...prev, stage: 'During' })), 980);
    window.setTimeout(() => setStressState((prev) => ({ ...prev, stage: 'After' })), 1460);
    window.setTimeout(() => setStressState((prev) => ({ ...prev, running: false })), 1900);
  };

  return (
    <div className={`cockpit-page ${stressState.running ? 'running' : ''}`}>
      <header id="topbar" role="banner">
        <div className="wordmark">RESEARCH<span>BETS</span></div>
        <div className="topbar-chips"><span className="boards-label">Boards: NBA | NFL | NHL</span></div>
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
          <button className="hamburger" aria-label="Open navigation menu" aria-expanded={ui.drawerOpen} onClick={() => setUi((p) => ({ ...p, drawerOpen: !p.drawerOpen }))}><span /><span /><span /></button>
        </div>
      </header>

      <section id="hero" aria-labelledby="hero-headline">
        <h1 className="hero-headline" id="hero-headline">One leg breaks.<br /><span className="hero-headline-accent">Find it first.</span></h1>
        <p className="hero-sub">Most slips don&apos;t fail randomly. They fail predictably. Isolate the pressure point before you submit.</p>
        <div className="cta-row">
          <button className="btn-primary" onClick={() => cockpitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Build from Tonight</button>
          <button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste Slip</button>
        </div>
      </section>

      <section id="cockpit" ref={cockpitRef} aria-label="Bettor cockpit: board and draft ticket">
        <div className="panel" id="board-panel">
          <div className="panel-header"><span className="panel-title">Tonight&apos;s Board</span></div>
          <div className="search-wrap"><input type="search" className="search-input" placeholder="Search props…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search player props" /></div>
          <div className="board-list" role="list">
            {Object.entries(groupedGames).map(([group, legs]) => (
              <div className="board-group" key={group}>
                <div className="group-label">{group}</div>
                {legs.map((leg) => {
                  const added = addedIds.includes(leg.id);
                  return (
                    <div key={leg.id} className="board-row" role="listitem">
                      <div>
                        <div className="board-main">{leg.player} • {leg.market} {leg.line}</div>
                        <div className="board-sub">Odds {leg.odds} · L10 {leg.l10}/10</div>
                      </div>
                      <button className={`add-btn ${added ? 'added' : ''}`} onClick={() => onAdd(leg)} disabled={added} aria-pressed={added}>+</button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="panel" id="ticket-panel">
          <div id="ticket-scan-sweep" />
          <div className="panel-header">
            <span className="panel-title">Draft Ticket</span>
            <span className="leg-count-badge" aria-live="polite">{legCount} {legCount === 1 ? 'leg' : 'legs'}</span>
          </div>
          <div className="ticket-body">
            {legCount === 0 ? (
              <div className="ticket-empty">
                <div className="ticket-empty-icon">⬡</div>
                <div className="ticket-empty-text">Add 2–4 legs to isolate pressure.</div>
              </div>
            ) : (
              <div className="ticket-legs" role="list">
                {ticketLegs.map((leg) => (
                  <div key={leg.id} className={`ticket-leg ${stressState.weakestId === leg.id ? 'weakest target-lock heat' : ''}`}>
                    <div>
                      <div className="ticket-leg-main">{leg.player} · {leg.market} {leg.line}</div>
                      <div className="ticket-leg-sub">{leg.game} · {leg.risk.toUpperCase()}</div>
                    </div>
                    <button className="remove-btn" onClick={() => onRemove(leg.id)} aria-label={`Remove ${leg.player}`}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="moat-block">
              <div className="moat-row"><span>Weakest leg</span><span>{ticketLegs.find((leg) => leg.id === stressState.weakestId)?.player ?? '—'}</span></div>
              <div className="moat-row"><span>Correlation pressure</span><span>{stressState.corrLabel} {stressState.corrValue.toFixed(1)}</span></div>
              <div className="moat-row"><span>Fragility index</span><span>{stressState.fragility.toFixed(1)}</span></div>
            </div>
          </div>

          <div className="ticket-cta-row">
            <button className={`btn-secondary ${stressEnabled ? 'enabled' : ''}`} onClick={runStressTest} disabled={!stressEnabled || stressState.running}>Run Stress Test</button>
            <button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, saveModalOpen: true }))}>Save Analysis</button>
          </div>
        </div>
      </section>

      <section className="pipeline-strip" aria-label="Run trace strip">
        <span id="trace-chip">{stressState.traceId}</span>
        <div className="stage-row">
          {['Before', 'Analyze', 'During', 'After'].map((stage) => (
            <div key={stage} className={`stage ${stressState.stage === stage ? 'active' : ''}`}>{stage}</div>
          ))}
        </div>
      </section>

      <section className="accordions" aria-label="Cockpit details">
        {ACCORDIONS.map((item) => {
          const open = ui.openAccordionIds.has(item.id);
          return (
            <article className={`accordion ${open ? 'open' : ''}`} key={item.id}>
              <button className="accordion-trigger" aria-expanded={open} onClick={() => toggleAccordion(item.id)}>{item.title}</button>
              {open && <div className="accordion-content">{item.content}</div>}
            </article>
          );
        })}
      </section>

      <footer className="cockpit-footer">
        <button className="btn-primary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: true }))}>Paste Slip</button>
      </footer>

      <div className={`drawer-overlay ${ui.drawerOpen ? 'open' : ''}`} onClick={() => setUi((p) => ({ ...p, drawerOpen: false }))} />
      <aside id="drawer" className={ui.drawerOpen ? 'open' : ''} aria-hidden={!ui.drawerOpen}>
        <button className="drawer-close" onClick={() => setUi((p) => ({ ...p, drawerOpen: false }))}>Close</button>
        <nav><a href="#hero">Hero</a><a href="#cockpit">Cockpit</a></nav>
      </aside>

      <div className={`modal-overlay ${ui.pasteModalOpen ? 'open' : ''}`} onClick={(e) => e.currentTarget === e.target && setUi((p) => ({ ...p, pasteModalOpen: false }))}>
        <div className="modal">
          <h2>Paste Slip</h2>
          <textarea ref={pasteInputRef} placeholder="Demo only: backend wiring comes later." />
          <button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, pasteModalOpen: false }))}>Close</button>
        </div>
      </div>

      <div className={`modal-overlay ${ui.saveModalOpen ? 'open' : ''}`} onClick={(e) => e.currentTarget === e.target && setUi((p) => ({ ...p, saveModalOpen: false }))}>
        <div className="modal">
          <h2>Save Analysis</h2>
          <input ref={saveInputRef} placeholder="Email (demo)" />
          <button className="btn-secondary" onClick={() => setUi((p) => ({ ...p, saveModalOpen: false }))}>Done</button>
        </div>
      </div>
    </div>
  );
}
