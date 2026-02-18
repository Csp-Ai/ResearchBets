'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { createClientRequestId, ensureAnonSessionId } from '../core/identifiers/session';
import { runUiAction } from '../core/ui/actionContract';
import { buildNavigationHref } from '../core/ui/navigation';

type Session = { sessionId: string; userId: string; anonSessionId?: string };
type Snapshot = {
  reportId: string;
  summary: string;
  confidenceSummary: { averageClaimConfidence: number };
  traceId: string;
};
type Bet = {
  id: string;
  selection: string;
  odds: number;
  stake: number;
  status: 'pending' | 'settled';
};
type EdgeReport = {
  kpis: { delta_clv_pct?: number };
  cohorts: {
    followed: { avg_clv_pct?: number; median_clv_pct?: number; sample_size?: number };
    not_followed: { avg_clv_pct?: number; median_clv_pct?: number; sample_size?: number };
  };
};

type EventItem = { event_name: string; timestamp: string; properties?: Record<string, unknown> };

const demoEvents: EventItem[] = [
  { event_name: 'external_fetch_started', timestamp: new Date().toISOString() }
];

export const selectTimelineEvents = (
  events: EventItem[]
): { rows: EventItem[]; usingDemo: boolean } => {
  if (events.length > 0) return { rows: events, usingDemo: false };
  return { rows: demoEvents, usingDemo: true };
};

export function TerminalLoopShell({ traceId }: { traceId?: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [dashboard, setDashboard] = useState<{
    roi: number;
    winRate: number;
    insights: string[];
  } | null>(null);
  const [edge, setEdge] = useState<EdgeReport | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [fallbackTraceId] = useState(() => traceId || createClientRequestId());
  const chainTraceId = traceId || snapshot?.traceId || fallbackTraceId;
  const router = useRouter();

  useEffect(() => {
    const anonSessionId = ensureAnonSessionId();
    const existingSession = window.localStorage.getItem('rb.sessionId');
    fetch('/api/anon/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: existingSession, anonSessionId })
    })
      .then((res) => res.json())
      .then((data: Session) => {
        setSession(data);
        window.localStorage.setItem('rb.sessionId', data.sessionId);
      });

    fetch('/api/bets?status=all')
      .then((res) => res.json())
      .then((data) => setBets(data.bets ?? []));
    fetch('/api/dashboard/summary')
      .then((res) => res.json())
      .then(setDashboard);
    fetch('/api/edge/report?window=30d')
      .then((res) => res.json())
      .then(setEdge);
  }, []);

  useEffect(() => {
    const activeTrace = chainTraceId;
    if (!activeTrace) return;
    fetch(`/api/events?trace_id=${activeTrace}&limit=10`)
      .then((res) => res.json())
      .then((data) => setEvents(data.events ?? []));
  }, [chainTraceId]);

  const startSnapshot = async () => {
    if (!session) return;
    const start = await fetch('/api/researchSnapshot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'NBA:LAL@BOS',
        sessionId: session.anonSessionId ?? session.sessionId,
        userId: session.userId,
        tier: 'free',
        seed: 'demo-seed',
        requestId: createClientRequestId()
      })
    }).then((res) => res.json());

    const report = await fetch(`/api/researchSnapshot/${start.snapshotId}`).then((res) =>
      res.json()
    );
    setSnapshot(report);
  };

  const timeline = useMemo(() => selectTimelineEvents(events), [events]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
        <h1 className="text-2xl font-semibold">Research Decision Terminal</h1>
        <p className="text-sm text-slate-400">
          Analyze evidence and outcomes in terminal form; not betting advice.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={startSnapshot} className="rounded bg-sky-600 px-3 py-2 text-sm font-medium">Continue Research</button>
          <button
            type="button"
            onClick={() => {
              void navigateWithAction('open_pending_bets', '/pending-bets');
            }}
            className="rounded border border-slate-700 px-3 py-2 text-sm"
          >
            Pending Bets
          </button>
          <button
            type="button"
            onClick={() => {
              void navigateWithAction('open_dashboard', '/dashboard');
            }}
            className="rounded border border-slate-700 px-3 py-2 text-sm"
          >
            Performance Dashboard
          </button>
        </div>
        <p className="mt-3 text-xs font-mono text-slate-400">
          30d ROI: {dashboard?.roi ?? 0}% · Win rate: {dashboard?.winRate ?? 0}%
        </p>
      </section>

      {snapshot ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
          <h2 className="text-xl font-semibold">Research Timeline Feed</h2>
          <p className="mt-1 text-sm text-slate-400">{snapshot.summary}</p>
          {timeline.usingDemo ? (
            <p className="mt-2 text-xs text-amber-300">
              Showing demo data until backend events arrive.
            </p>
          ) : null}
          <ul className="mt-4 space-y-2">
            {timeline.rows.map((event, idx) => (
              <li
                key={`${event.event_name}-${idx}`}
                className="rounded border border-slate-800 bg-slate-950/70 p-3 text-sm"
              >
                <p>{event.event_name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                void navigateWithAction(
                  'open_research_result',
                  buildNavigationHref({
                    pathname: '/research',
                    traceId: snapshot.traceId || chainTraceId,
                    params: { snapshotId: snapshot.reportId }
                  })
                );
              }}
              className="rounded border border-slate-700 px-3 py-2 text-sm"
            >
              Log this result
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
        <h2 className="text-xl font-semibold">Delta & Calibration Review</h2>
        <p className="mt-1 text-xs text-slate-400">
          Delta is a market-model gap for review, not a pick.
        </p>
        <p className="text-xs font-mono text-emerald-400">
          Δ CLV {edge?.kpis?.delta_clv_pct ?? 0}% (delta is not a pick)
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
          <article className="rounded border border-slate-800 p-3">
            <h3>Followed research process</h3>
            <p>
              Avg CLV {edge?.cohorts.followed.avg_clv_pct ?? 0}% · Median{' '}
              {edge?.cohorts.followed.median_clv_pct ?? 0}% · Sample{' '}
              {edge?.cohorts.followed.sample_size ?? 0}
            </p>
          </article>
          <article className="rounded border border-slate-800 p-3">
            <h3>Did not follow process</h3>
            <p>
              Avg CLV {edge?.cohorts.not_followed.avg_clv_pct ?? 0}% · Median{' '}
              {edge?.cohorts.not_followed.median_clv_pct ?? 0}% · Sample{' '}
              {edge?.cohorts.not_followed.sample_size ?? 0}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
        <h2 className="text-xl font-semibold">Recent Logged Positions</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {bets.slice(0, 5).map((bet) => (
            <li
              key={bet.id}
              className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2"
            >
              <span>
                {bet.selection} · stake ${bet.stake} · status {bet.status} (tracking only)
              </span>
            </li>
          ))}
          {bets.length === 0 ? <li className="text-slate-400">No positions logged yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
