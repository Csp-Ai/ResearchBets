'use client';

import { useState } from 'react';

import { createBetInputSchema, type CreateBetInput } from '@/entities/bet/model';

type BetSlipIngestionFormProps = {
  onConfirm: (betInput: CreateBetInput) => void;
};

function parseTextareaPayload(rawText: string): CreateBetInput {
  const parsed = JSON.parse(rawText) as unknown;
  return createBetInputSchema.parse(parsed);
}

export function BetSlipIngestionForm({ onConfirm }: BetSlipIngestionFormProps) {
  const [rawInput, setRawInput] = useState(`{
  "sport": "NBA",
  "market": "Spread",
  "selection": "Lakers -4.5",
  "oddsAmerican": -110,
  "stake": 100,
  "potentialPayout": 190.91,
  "eventStartsAt": "2026-09-01T01:00:00.000Z"
}`);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const betInput = parseTextareaPayload(rawInput);
      onConfirm(betInput);
      setError(null);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error ? submissionError.message : 'Invalid payload.';
      setError(message);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">Bet Slip Ingestion</h2>
      <p className="mt-1 text-sm text-slate-400">
        Paste normalized JSON for v1 ingestion validation.
      </p>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <textarea
          className="h-64 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs"
          onChange={(event) => setRawInput(event.target.value)}
          value={rawInput}
        />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          type="submit"
        >
          Confirm Bet
        </button>
      </form>
    </section>
  );
}
