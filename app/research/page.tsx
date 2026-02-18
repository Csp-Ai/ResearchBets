'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function ResearchPage() {
  const search = useSearchParams();
  const snapshotId = search.get('snapshotId') ?? '';
  const [status, setStatus] = useState('');

  const submit = async (formData: FormData) => {
    const sessionId = window.localStorage.getItem('rb.sessionId') ?? '';
    const userId = 'unknown-user';
    const bet = {
      sessionId,
      userId,
      snapshotId,
      traceId: formData.get('traceId')?.toString() ?? 'trace-ui',
      runId: formData.get('runId')?.toString() ?? 'run-ui',
      selection: formData.get('selection')?.toString() ?? 'Unknown',
      odds: Number(formData.get('odds') ?? 1.91),
      stake: Number(formData.get('stake') ?? 100),
      confidence: Number(formData.get('confidence') ?? 0.65),
      idempotencyKey: formData.get('idempotencyKey')?.toString() ?? crypto.randomUUID(),
    };

    const response = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bet),
    });

    setStatus(response.ok ? 'Bet logged.' : 'Failed to log bet.');
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-semibold">Log Bet</h1>
      <p className="text-sm text-slate-400">Snapshot frozen: {snapshotId}</p>
      <form action={submit} className="mt-4 grid gap-3 text-sm">
        <input className="rounded bg-slate-950 p-2" name="selection" placeholder="Selection" defaultValue="BOS -3.5" />
        <input className="rounded bg-slate-950 p-2" name="odds" placeholder="Decimal odds" defaultValue="1.91" />
        <input className="rounded bg-slate-950 p-2" name="stake" placeholder="Stake" defaultValue="100" />
        <input className="rounded bg-slate-950 p-2" name="confidence" placeholder="Confidence" defaultValue="0.68" />
        <input className="rounded bg-slate-950 p-2" name="traceId" placeholder="traceId" defaultValue="trace-ui" />
        <input className="rounded bg-slate-950 p-2" name="runId" placeholder="runId" defaultValue="run-ui" />
        <input className="rounded bg-slate-950 p-2" name="idempotencyKey" placeholder="idempotency key" defaultValue="log-bet-demo" />
        <button type="submit" className="rounded bg-sky-600 px-3 py-2 font-medium">Save Bet</button>
      </form>
      <p className="mt-2 text-xs text-slate-400">{status}</p>
    </section>
  );
}
