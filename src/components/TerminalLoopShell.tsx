'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Session = { sessionId: string; userId: string };

type Snapshot = { reportId: string; summary: string; confidenceSummary: { averageClaimConfidence: number }; claims: Array<{ text: string; confidence: number }>; runId: string; traceId: string };

type Bet = { id: string; selection: string; odds: number; stake: number; status: 'pending' | 'settled'; snapshotId: string };

type AgentNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  status: 'active' | 'conflict' | 'idle' | 'highConfidence';
};

const agentNodes: AgentNode[] = [
  { id: 'fetch', label: 'External Fetch', x: 18, y: 38, status: 'active' },
  { id: 'consensus', label: 'Consensus', x: 44, y: 20, status: 'conflict' },
  { id: 'normalize', label: 'Normalize', x: 50, y: 54, status: 'active' },
  { id: 'score', label: 'Score', x: 74, y: 30, status: 'highConfidence' },
  { id: 'persist', label: 'Persist', x: 86, y: 64, status: 'idle' },
];

const researchEvents = [
  { icon: '🌐', name: 'External fetch started', time: '09:31:07', details: 'Odds, injuries, and recent form sources fetched.' },
  { icon: '🤝', name: 'Consensus evaluated', time: '09:31:13', details: '2/3 sources agree; one source price drift noted.' },
  { icon: '🧼', name: 'Evidence normalized', time: '09:31:14', details: 'Claims deduped, confidence adjusted by provenance quality.' },
  { icon: '🧠', name: 'Agent scored decision', time: '09:31:18', details: 'Model confidence 0.72 with medium disagreement penalty.' },
  { icon: '🗂', name: 'Recommendation persisted', time: '09:31:19', details: 'Snapshot and trace persisted to immutable report store.' },
];

const edgeComparison = {
  followed: { avgClv: '+1.9%', medianClv: '+1.2%', sample: 126, ci: '1.1% to 2.7%' },
  unfollowed: { avgClv: '-0.7%', medianClv: '-0.3%', sample: 104, ci: '-1.8% to 0.2%' },
};

export function TerminalLoopShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [dashboard, setDashboard] = useState<{ roi: number; winRate: number; insights: string[] } | null>(null);

  useEffect(() => {
    const existingSession = window.localStorage.getItem('rb.sessionId');
    fetch('/api/anon/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: existingSession }),
    })
      .then((res) => res.json())
      .then((data: Session) => {
        setSession(data);
        window.localStorage.setItem('rb.sessionId', data.sessionId);
      });

    fetch('/api/bets?status=all').then((res) => res.json()).then((data) => setBets(data.bets));
    fetch('/api/dashboard/summary').then((res) => res.json()).then(setDashboard);
  }, []);

  const startSnapshot = async () => {
    if (!session) return;
    const start = await fetch('/api/researchSnapshot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'NBA:LAL@BOS',
        sessionId: session.sessionId,
        userId: session.userId,
        tier: 'free',
        seed: 'demo-seed',
      }),
    }).then((res) => res.json());

    const report = await fetch(`/api/researchSnapshot/${start.snapshotId}`).then((res) => res.json());
    setSnapshot(report);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
        <h1 className="text-2xl font-semibold">AI Decision Intelligence Terminal</h1>
        <p className="text-sm text-slate-400">System-first workflow: observe intelligence, inspect evidence, then act.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={startSnapshot} className="rounded bg-sky-600 px-3 py-2 text-sm font-medium">Continue Research</button>
          <Link href="/pending-bets" className="rounded border border-slate-700 px-3 py-2 text-sm">Pending Bets</Link>
          <Link href="/dashboard" className="rounded border border-slate-700 px-3 py-2 text-sm">Performance Dashboard</Link>
        </div>
        <p className="mt-3 text-xs font-mono text-slate-400">7d ROI: {dashboard?.roi ?? 0}% · Win rate: {dashboard?.winRate ?? 0}% · Fresh 2m ago</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Agent Activity Graph</h2>
            <p className="text-xs font-mono text-slate-400">Consensus: 2 sources agree</p>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.08),transparent_35%),linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:auto,28px_28px,28px_28px] p-4">
            <svg viewBox="0 0 100 80" className="h-56 w-full">
              <path d="M18 38 L44 20 L74 30 L86 64" stroke="rgba(148,163,184,0.38)" strokeWidth="1" fill="none" />
              <path d="M18 38 L50 54 L86 64" stroke="rgba(148,163,184,0.30)" strokeWidth="1" fill="none" />
              {agentNodes.map((node) => (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r="5.2" className={`agent-node ${node.status}`} />
                  <text x={node.x} y={node.y + 10} textAnchor="middle" className="fill-slate-300 text-[3.1px]">{node.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
          <h2 className="text-xl font-semibold">Confidence Surface</h2>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="relative grid h-28 w-28 place-items-center rounded-full border border-slate-700"
              style={{
                background: `conic-gradient(rgb(20 184 166) ${(snapshot?.confidenceSummary.averageClaimConfidence ?? 0.65) * 360}deg, rgb(30 41 59) 0deg)`,
              }}
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-950 text-lg font-semibold">
                {Math.round((snapshot?.confidenceSummary.averageClaimConfidence ?? 0.65) * 100)}%
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-mono text-slate-300">Calibration trend: +0.08</p>
              <p className="font-mono text-slate-300">Projected variance: 1.4σ</p>
              <p className="font-mono text-slate-300">Disagreement score: 0.24</p>
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Risk distribution</p>
            <div className="h-12 rounded border border-slate-800 bg-slate-950 p-2">
              <div className="risk-bars h-full">
                <span style={{ height: '38%' }} />
                <span style={{ height: '58%' }} />
                <span style={{ height: '74%' }} />
                <span style={{ height: '50%' }} />
                <span style={{ height: '40%' }} />
                <span style={{ height: '22%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {snapshot ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
          <h2 className="text-xl font-semibold">Research Timeline</h2>
          <p className="mt-1 text-sm text-slate-400">{snapshot.summary}</p>
          <ul className="mt-4 space-y-3">
            {researchEvents.map((event) => (
              <li key={event.name} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm"><span className="mr-2">{event.icon}</span>{event.name}</p>
                  <p className="text-xs font-mono text-slate-400">{event.time}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">{event.details}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="https://sportsbook.example.com" target="_blank" rel="noreferrer" className="rounded bg-emerald-600 px-3 py-2 text-sm">Place bet</a>
            <Link href={`/research?snapshotId=${snapshot.reportId}`} className="rounded border border-slate-700 px-3 py-2 text-sm">Log this bet</Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edge & Calibration Proof</h2>
          <p className="text-xs font-mono text-emerald-400">Δ CLV +2.6%</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4">
            <h3 className="font-medium">Followed AI</h3>
            <p className="mt-2 text-sm font-mono">Avg CLV {edgeComparison.followed.avgClv}</p>
            <p className="text-sm font-mono">Median CLV {edgeComparison.followed.medianClv}</p>
            <p className="text-sm font-mono">Sample {edgeComparison.followed.sample}</p>
            <p className="text-xs text-slate-400">95% CI {edgeComparison.followed.ci}</p>
          </article>
          <article className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-4">
            <h3 className="font-medium">Did Not Follow</h3>
            <p className="mt-2 text-sm font-mono">Avg CLV {edgeComparison.unfollowed.avgClv}</p>
            <p className="text-sm font-mono">Median CLV {edgeComparison.unfollowed.medianClv}</p>
            <p className="text-sm font-mono">Sample {edgeComparison.unfollowed.sample}</p>
            <p className="text-xs text-slate-400">95% CI {edgeComparison.unfollowed.ci}</p>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6">
        <h2 className="text-xl font-semibold">Recent Bets</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {bets.slice(0, 5).map((bet) => (
            <li key={bet.id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
              <span>{bet.selection} · stake ${bet.stake} · status {bet.status}</span>
              <span className="text-xs font-mono text-slate-400">Fresh 2m ago</span>
            </li>
          ))}
          {bets.length === 0 ? <li className="text-slate-400">No bets logged yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
