'use client';

import Link from 'next/link';
import { useRef, useState, type ChangeEvent } from 'react';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { saveTrackedTicket } from '@/src/core/track/store';
import type { TrackedTicket } from '@/src/core/track/types';
import { withTraceId } from '@/src/core/trace/queryTrace';

type Props = {
  onTracked: () => void;
  onOpenDraft: () => void;
  onTrySample: () => Promise<void>;
  sampleLoading: boolean;
};

export function TrackSlipInput({ onTracked, onOpenDraft, onTrySample, sampleLoading }: Props) {
  const nervous = useNervousSystem();
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        throw new Error(payload.error?.message ?? 'Could not track this slip yet.');
      }
      saveTrackedTicket(payload.data);
      onTracked();
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : 'Could not track this slip yet.');
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
