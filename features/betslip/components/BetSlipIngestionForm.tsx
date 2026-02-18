'use client';

import Link from 'next/link';
import { useState } from 'react';

import { createClientRequestId, ensureAnonSessionId } from '@/src/core/identifiers/session';

type ExtractedLeg = { selection: string; market?: string; odds?: string };

export function BetSlipIngestionForm() {
  const [rawInput, setRawInput] = useState('Lakers -4.5 spread -110\nCeltics moneyline -120');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ slipId: string; traceId: string; legs: ExtractedLeg[] } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const anonSessionId = ensureAnonSessionId();
      const requestId = createClientRequestId();

      const submitRes = await fetch('/api/slips/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'paste', raw_text: rawInput, anon_session_id: anonSessionId, request_id: requestId }),
      }).then((res) => res.json());

      const extractRes = await fetch('/api/slips/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slip_id: submitRes.slip_id, request_id: createClientRequestId(), anon_session_id: anonSessionId }),
      }).then((res) => res.json());

      setResult({ slipId: submitRes.slip_id, traceId: submitRes.trace_id, legs: extractRes.extracted_legs ?? [] });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Invalid payload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">Slip ingestion</h2>
      <p className="mt-1 text-sm text-slate-400">Paste raw slip text to persist, parse, and start a decision clarity snapshot.</p>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <textarea className="h-64 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs" onChange={(event) => setRawInput(event.target.value)} value={rawInput} />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit slip'}
        </button>
      </form>

      {result ? (
        <div className="mt-5 space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-200">Extracted legs ({result.legs.length})</p>
          <ul className="space-y-2 text-xs text-slate-300">
            {result.legs.map((leg, index) => (
              <li key={`${leg.selection}-${index}`}>{leg.selection} {leg.market ? `· ${leg.market}` : ''} {leg.odds ? `· ${leg.odds}` : ''}</li>
            ))}
          </ul>
          <Link className="inline-flex rounded border border-sky-500 px-3 py-2 text-sm text-sky-300 hover:bg-sky-500/10" href={`/research?slip_id=${result.slipId}&trace_id=${result.traceId}`}>
            Start Research Snapshot
          </Link>
        </div>
      ) : null}
    </section>
  );
}
