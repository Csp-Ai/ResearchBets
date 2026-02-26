'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TRACKER_EVENTS, TRACKER_STEPS } from './landingData';
import styles from './landing.module.css';

const delays = [200, 900, 800, 900, 1100];

export function Tracker({
  mode,
  autoRunToken,
  updatedLabel,
  reason
}: {
  mode: 'demo' | 'live';
  autoRunToken: number;
  updatedLabel: string;
  reason?: string;
}) {
  const [active, setActive] = useState(-1);
  const [done, setDone] = useState(-1);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<Array<{ event_name: string; agent_id: string }>>([]);
  const [traceId, setTraceId] = useState('—');
  const anchor = useRef<HTMLDivElement | null>(null);
  const icons = useMemo(() => ({ queued: '○', running: '◌', done: '✓' }), []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true); setActive(-1); setDone(-1); setEvents([]); setTraceId(`trace_${Math.random().toString(36).slice(2, 8)}`);
    for (let i = 0; i < TRACKER_STEPS.length; i += 1) {
      await new Promise((r) => window.setTimeout(r, delays[i]));
      setActive(i);
      await new Promise((r) => window.setTimeout(r, 500));
      setDone(i);
const event = TRACKER_EVENTS[i];
      if (event) setEvents((prev) => [event, ...prev]);
    }
    setActive(-1); setRunning(false);
  }, [running]);

  useEffect(() => { if (autoRunToken > 0) void run(); }, [autoRunToken, run]);

  return <section id="tracker" className={styles.trackerSection}><div className={styles.trackerInner}><div className={styles.trackerCopy}><div className={styles.sectionLabel}>{mode === 'live' ? 'Live telemetry' : 'Demo telemetry'} · {updatedLabel}{reason ? ` · ${reason}` : ''}</div><h2>Watch a slip<br />get checked.</h2><p className={styles.sectionCaption}>Pipeline trace showing parse → enrich → correlate → verdict in order.</p></div><div ref={anchor}><div className={styles.trackerCard}><div className={styles.trackerCardHeader}><div className={styles.tcol}><span className={styles.trackerTitle}>Agent run</span></div><span className={styles.traceId}>trace_id: {traceId}</span></div><div className={styles.stepsList}>{TRACKER_STEPS.map((step, i) => { const state = i <= done ? 'done' : i === active ? 'running' : 'queued'; return <div key={step.label} className={styles.stepRow}><div className={`${styles.stepIcon} ${styles[state]}`}>{icons[state as keyof typeof icons]}</div><div className={styles.stepContent}><div className={`${styles.stepLabel} ${styles[state]}`}>{step.label}</div><div className={`${styles.stepDetail} ${state !== 'queued' ? styles.visible : ''}`}>{step.detail}</div></div></div>; })}</div><div className={styles.eventFeed}>{events.length ? events.map((evt) => <div key={`${evt.event_name}-${evt.agent_id}`} className={styles.eventRow}><span className={styles.eventName}>{evt.event_name}</span><span className={styles.eventAgent}>· {evt.agent_id}</span></div>) : <div className={styles.trackerStatus}>No events yet.</div>}</div><div className={styles.trackerFooter}><span className={`${styles.trackerStatus} ${running ? styles.running : ''}`}>{running ? 'Running...' : 'Idle. Hit run to start.'}</span><button type="button" className={styles.btnRun} onClick={run} disabled={running}>{running ? '⟳ Running...' : `▶ Run ${mode} pipeline`}</button></div></div></div></div></section>;
}
