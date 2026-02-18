'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Session = { sessionId: string; userId: string };

type Snapshot = { reportId: string; summary: string; confidenceSummary: { averageClaimConfidence: number }; claims: Array<{ text: string; confidence: number }>; runId: string; traceId: string };

type Bet = { id: string; selection: string; odds: number; stake: number; status: 'pending' | 'settled'; snapshotId: string };

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
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm text-slate-400">Open app → research snapshot → place bet → log → settle → dashboard → insights.</p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={startSnapshot} className="rounded bg-sky-600 px-3 py-2 text-sm font-medium">Continue Research</button>
          <Link href="/pending-bets" className="rounded border border-slate-700 px-3 py-2 text-sm">Pending Bets</Link>
          <Link href="/dashboard" className="rounded border border-slate-700 px-3 py-2 text-sm">Performance Dashboard</Link>
        </div>
        <p className="mt-3 text-xs text-slate-400">7d ROI: {dashboard?.roi ?? 0}% · Win rate: {dashboard?.winRate ?? 0}%</p>
      </section>

      {snapshot ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Research Snapshot</h2>
          <p className="mt-1 text-sm text-slate-400">{snapshot.summary}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {snapshot.claims.map((claim) => (
              <li key={claim.text}>{claim.text} ({Math.round(claim.confidence * 100)}%)</li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3">
            <a href="https://sportsbook.example.com" target="_blank" rel="noreferrer" className="rounded bg-emerald-600 px-3 py-2 text-sm">Place bet</a>
            <Link href={`/research?snapshotId=${snapshot.reportId}`} className="rounded border border-slate-700 px-3 py-2 text-sm">Log this bet</Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Recent Bets</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {bets.slice(0, 5).map((bet) => (
            <li key={bet.id}>{bet.selection} · stake ${bet.stake} · status {bet.status}</li>
          ))}
          {bets.length === 0 ? <li className="text-slate-400">No bets logged yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
