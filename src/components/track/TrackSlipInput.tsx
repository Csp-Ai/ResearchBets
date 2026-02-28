'use client';

import Link from 'next/link';
import { useRef, useState, type ChangeEvent } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { saveTrackedTicket } from '@/src/core/track/store';
import type { TrackedTicket, TrackedTicketLeg } from '@/src/core/track/types';
import { withTraceId } from '@/src/core/trace/queryTrace';

type Props = {
  onTracked: () => void;
  onOpenDraft: () => void;
  onTrySample: () => Promise<void>;
  sampleLoading: boolean;
};

function needsReview(leg: TrackedTicketLeg) {
  return leg.parseConfidence === 'low' || !leg.player.trim() || !leg.marketType || !(leg.threshold > 0);
}

function createLeg(index: number, source: string): TrackedTicketLeg {
  return {
    legId: `leg-${index}`,
    league: 'NBA',
    player: '',
    rawPlayer: '',
    marketType: 'points',
    marketLabel: 'Points',
    threshold: 0,
    direction: 'over',
    source,
    parseConfidence: 'low',
    needsReview: true,
    rawText: 'Unparsed leg'
  };
}

export function TrackSlipInput({ onTracked, onOpenDraft, onTrySample, sampleLoading }: Props) {
  const nervous = useNervousSystem();
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedTicket, setParsedTicket] = useState<TrackedTicket | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const trackText = async (text: string, sourceHint: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/slips/parseText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceHint })
      });
      const payload = await response.json() as { ok?: boolean; data?: TrackedTicket; error?: { message?: string } };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? 'Could not parse this slip yet.');
      }
      setParsedTicket(payload.data);
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : 'Could not parse this slip yet.');
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const { runOcr } = await import('@/src/features/ingest/ocr/ocrClient');
      const text = await runOcr(file);
      setRawText(text);
      await trackText(text, 'screenshot');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not read screenshot.');
    }
  };

  const updateLeg = (legId: string, patch: Partial<TrackedTicketLeg>) => {
    setParsedTicket((current) => {
      if (!current) return current;
      return {
        ...current,
        legs: current.legs.map((leg) => (leg.legId === legId ? { ...leg, ...patch } : leg)).map((leg) => ({ ...leg, needsReview: needsReview(leg) }))
      };
    });
  };

  const confirmTracked = () => {
    if (!parsedTicket) return;
    const ticketId = parsedTicket.ticketId.startsWith('ticket_') && parsedTicket.ticketId.length > 20
      ? parsedTicket.ticketId
      : `ticket_${crypto.randomUUID()}`;
    const normalizedTicket: TrackedTicket = {
      ...parsedTicket,
      ticketId,
      cashoutAvailable: typeof parsedTicket.cashoutValue === 'number',
      cashoutValue: typeof parsedTicket.cashoutValue === 'number' ? parsedTicket.cashoutValue : undefined,
      legs: parsedTicket.legs.map((leg, index) => ({ ...leg, legId: leg.legId || `leg-${index + 1}`, needsReview: needsReview(leg) }))
    };
    saveTrackedTicket(normalizedTicket, { replaceTicketId: parsedTicket.ticketId });
    setParsedTicket(null);
    onTracked();
  };

  if (parsedTicket) {
    return (
      <section className="mt-4 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
        <h3 className="text-sm font-semibold">Verify tracked slip</h3>
        <p className="mt-1 text-xs text-slate-300">Quick check before tracking live updates.</p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="text-left text-slate-300">
              <tr>
                <th className="pb-2">Player</th><th className="pb-2">Market</th><th className="pb-2">Line</th><th className="pb-2">Over/Under</th><th className="pb-2">Odds</th><th className="pb-2">Confidence</th><th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parsedTicket.legs.map((leg, index) => (
                <tr key={leg.legId} className="border-t border-slate-800">
                  <td className="py-2 pr-2"><input aria-label={`player-${index + 1}`} className="w-full rounded border border-slate-700 bg-slate-950 p-1" value={leg.player} onChange={(event) => updateLeg(leg.legId, { player: event.target.value, rawPlayer: event.target.value })} /></td>
                  <td className="py-2 pr-2"><input aria-label={`market-${index + 1}`} className="w-full rounded border border-slate-700 bg-slate-950 p-1" value={leg.marketType} onChange={(event) => updateLeg(leg.legId, { marketType: (event.target.value || 'points') as TrackedTicketLeg['marketType'] })} /></td>
                  <td className="py-2 pr-2"><input aria-label={`line-${index + 1}`} type="number" step="0.1" className="w-20 rounded border border-slate-700 bg-slate-950 p-1" value={Number.isFinite(leg.threshold) ? leg.threshold : 0} onChange={(event) => updateLeg(leg.legId, { threshold: Number(event.target.value) })} /></td>
                  <td className="py-2 pr-2"><select aria-label={`direction-${index + 1}`} className="rounded border border-slate-700 bg-slate-950 p-1" value={leg.direction} onChange={(event) => updateLeg(leg.legId, { direction: event.target.value as 'over' | 'under' })}><option value="over">Over</option><option value="under">Under</option></select></td>
                  <td className="py-2 pr-2"><input aria-label={`odds-${index + 1}`} className="w-20 rounded border border-slate-700 bg-slate-950 p-1" value={leg.odds ?? ''} onChange={(event) => updateLeg(leg.legId, { odds: event.target.value })} /></td>
                  <td className="py-2 pr-2">
                    <span className="rounded-full border border-white/20 px-2 py-0.5">{leg.parseConfidence}</span>
                    {needsReview(leg) ? <span className="ml-1 rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-0.5">Needs review</span> : null}
                  </td>
                  <td className="py-2"><button type="button" className="underline text-rose-200" onClick={() => setParsedTicket((current) => current ? ({ ...current, legs: current.legs.filter((item) => item.legId !== leg.legId) }) : current)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex gap-2 text-xs">
          <button type="button" className="rounded border border-white/20 px-2 py-1" onClick={() => setParsedTicket((current) => current ? ({ ...current, legs: [...current.legs, createLeg(current.legs.length + 1, current.sourceHint)] }) : current)}>+ Add leg</button>
        </div>

        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-slate-300">Cashout value (optional)</span>
            <input
              aria-label="cashout-value"
              type="number"
              step="0.01"
              min="0"
              className="rounded border border-slate-700 bg-slate-950 p-1"
              value={typeof parsedTicket.cashoutValue === 'number' ? parsedTicket.cashoutValue : ''}
              onChange={(event) => {
                const value = event.target.value;
                setParsedTicket((current) => current ? ({
                  ...current,
                  cashoutAvailable: value.trim().length > 0,
                  cashoutValue: value.trim().length > 0 ? Number(value) : undefined
                }) : current);
              }}
              placeholder="Leave blank if unknown"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-cyan-100" onClick={confirmTracked}>Confirm &amp; track</button>
          <button type="button" className="rounded-lg border border-white/20 px-3 py-2" onClick={() => setParsedTicket(null)}>Back to edit text</button>
        </div>

        <details className="mt-3 text-xs text-slate-300">
          <summary className="cursor-pointer">Raw slip text</summary>
          <p className="mt-1 whitespace-pre-wrap">{parsedTicket.rawSlipText}</p>
        </details>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
      <label className="text-xs text-slate-300" htmlFor="track-slip-text">Paste slip</label>
      <textarea
        id="track-slip-text"
        className="mt-1 h-28 w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs"
        placeholder="Paste FanDuel/BetMGM/PrizePicks slip text…"
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
      />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={(event) => { void onUpload(event); }} />
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" className="rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-3 py-2 text-cyan-100 disabled:opacity-60" onClick={() => void trackText(rawText, 'paste')} disabled={loading || !rawText.trim()}>
          {loading ? 'Tracking…' : 'Track slip'}
        </button>
        <button type="button" className="rounded-lg border border-white/20 px-3 py-2" onClick={() => fileRef.current?.click()} disabled={loading}>Upload slip screenshot</button>
        <button type="button" className="rounded-lg border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-emerald-100 disabled:opacity-60" onClick={() => void onTrySample()} disabled={sampleLoading}>
          {sampleLoading ? 'Building sample…' : 'Try sample tracked slip (demo)'}
        </button>
        <button type="button" className="rounded-lg border border-white/20 px-3 py-2" onClick={onOpenDraft}>Open latest draft</button>
        <Link href={appendQuery(nervous.toHref('/tonight'), {})} className="rounded-lg border border-white/20 px-3 py-2">Open Tonight</Link>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Tracked routes preserve trace continuity: {withTraceId(nervous.toHref('/track'), nervous.trace_id ?? 'trace_demo_track')}</p>
    </section>
  );
}
