'use client';

import React, { useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

import { appendQuery } from '@/src/components/landing/navigation';
import { parseSlipSubmitEnvelope } from '@/src/core/slips/apiAdapters';
import type { TrackedTicket } from '@/src/core/track/types';
import { ParsedSlipReview } from '@/src/components/ingest/ParsedSlipReview';
import { reviewTicketIssues, toReviewLeg, toReviewedDraftLegs, type ImportSource, type ReviewLeg } from '@/src/core/track/slipReview';
import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';

const DEFAULT_SLIP = '';

type ParseTextResponse = {
  ok: boolean;
  data?: TrackedTicket;
  error?: { message?: string };
};

export default function IngestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = useMemo(() => searchParams.get('prefill') ?? DEFAULT_SLIP, [searchParams]);
  const [slipText, setSlipText] = useState(prefill);
  const [sourceType, setSourceType] = useState<'self' | 'shared'>('self');
  const nervous = useNervousSystem();
  const { replaceState } = useDraftSlip();
  const [loading, setLoading] = useState(false);
  const [xrayLoading, setXrayLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [parsedReview, setParsedReview] = useState<ReviewLeg[] | null>(null);
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const [importSource, setImportSource] = useState<ImportSource>('paste');
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [artifactStatus, setArtifactStatus] = useState<string | null>(null);
  const ocrWorkerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);
  const ocrAbortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onReviewSelections = async () => {
    if (!slipText.trim()) return;
    setXrayLoading(true);
    setStatus('Identifying selections…');
    try {
      const response = await fetch('/api/slips/parseText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: slipText, sourceHint: importSource, trace_id: nervous.trace_id }),
      });
      const payload = (await response.json().catch(() => ({}))) as ParseTextResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? 'Could not read these selections. You can edit the text and try again.');
      }
      setParsedReview(payload.data.legs.map(toReviewLeg));
      setReviewAcknowledged(false);
      setStatus('Compare each selection with the sportsbook ticket. Add any missed legs.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to prepare selections for review.');
    } finally {
      setXrayLoading(false);
    }
  };

  const onConfirmAndAnalyze = async () => {
    if (!parsedReview || !reviewAcknowledged) return;
    const issues = reviewTicketIssues(parsedReview);
    if (issues.length) {
      setStatus(issues[0]);
      return;
    }
    setLoading(true);
    setStatus('Saving your reviewed selections and opening X-Ray…');
    try {
      const confirmed = toReviewedDraftLegs(parsedReview, importSource);
      const response = await fetch('/api/slips/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: sourceType,
          source: importSource === 'screenshot' ? 'upload' : 'paste',
          raw_text: slipText,
          legs: confirmed.map((leg) => ({
            player: leg.player, marketType: leg.marketType, line: leg.line,
            odds: leg.odds ?? null, game: leg.game ?? null,
            league: parsedReview.find((item) => item.legId === leg.id)?.league ?? 'Unknown',
            direction: parsedReview.find((item) => item.legId === leg.id)?.direction ?? 'over',
            review_state: 'bettor_reviewed',
          })),
          spine: { sport: parsedReview[0]?.league ?? nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      const submitted = parseSlipSubmitEnvelope(payload);
      if (!response.ok || !submitted.success || !submitted.data.ok) {
        throw new Error(submitted.success && !submitted.data.ok ? submitted.data.error.message : 'Could not open X-Ray. Your reviewed selections are still here.');
      }
      const slipId = submitted.data.data.slip_id;
      const traceId = submitted.data.data.trace_id;
      replaceState({ slip_id: slipId, trace_id: traceId, legs: confirmed });
      router.push(nervous.toHref('/stress-test', {
        sport: parsedReview[0]?.league ?? nervous.sport,
        slip_id: slipId,
        trace_id: traceId,
      }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to submit the reviewed ticket.');
    } finally {
      setLoading(false);
    }
  };

  const editRawText = () => {
    setParsedReview(null);
    setReviewAcknowledged(false);
    setStatus('Edit the text, then review the selections again.');
  };

  const onUploadClick = () => {
    setOcrError(null);
    setArtifactStatus(null);
    fileInputRef.current?.click();
  };

  const onCancelOcr = async () => {
    if (!isOcrRunning) return;
    ocrAbortControllerRef.current?.abort();
    if (ocrWorkerRef.current) {
      await ocrWorkerRef.current.terminate().catch(() => undefined);
      ocrWorkerRef.current = null;
    }
    ocrAbortControllerRef.current = null;
    setIsOcrRunning(false);
    setOcrProgress(null);
    setOcrError('OCR canceled. You can upload a screenshot again.');
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setOcrError('Please upload a PNG or JPG screenshot.');
      return;
    }

    setIsOcrRunning(true);
    setOcrProgress('Reading text… 0%');
    setOcrError(null);
    setStatus(null);
    // A screenshot is private by default. Run local OCR first and never upload
    // the image as a hidden prerequisite to a free X-Ray.
    setArtifactStatus('Reading the image on this device. The screenshot will not be uploaded.');
    setParsedReview(null);
    setReviewAcknowledged(false);
    setImportSource('paste');
    const abortController = new AbortController();
    ocrAbortControllerRef.current = abortController;

    try {
      const { runOcr } = await import('@/src/features/ingest/ocr/ocrClient');
      const normalized = await runOcr(file, (progressLabel) => {
        setOcrProgress(progressLabel);
      }, {
        signal: abortController.signal,
        onWorkerChange: (worker) => {
          ocrWorkerRef.current = worker;
        }
      });

      setSlipText(normalized);
      setImportSource('screenshot');
      setStatus('Text recognized. Next, check every selection against your screenshot.');
      setArtifactStatus('Your screenshot stayed on this device. Only extracted text is sent when you choose Review selections.');
    } catch (uploadError) {
      if (uploadError instanceof DOMException && uploadError.name === 'AbortError') {
        setOcrError('OCR canceled. You can upload a screenshot again.');
      } else if (uploadError instanceof Error) {
        setOcrError(uploadError.message);
      } else {
        setOcrError('Could not read the screenshot. Try another image or paste your slip manually.');
      }
    } finally {
      ocrAbortControllerRef.current = null;
      ocrWorkerRef.current = null;
      setIsOcrRunning(false);
      setOcrProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-4 pb-28 md:py-8">
      <header className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/60">Screenshot → structure → X-Ray</div>
        <h1 className="text-3xl font-semibold">Scan my bet slip</h1>
        <p className="text-sm text-slate-300">Upload a sportsbook screenshot or paste selections. Check the names, lines, and markets before opening a structural X-Ray. We don't guess when information is missing.</p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={() => setSourceType('self')} className={`rounded-full px-3 py-1 ${sourceType === 'self' ? 'bg-cyan-400 text-slate-950' : 'border border-white/20 text-slate-200'}`}>My slip</button>
        <button type="button" onClick={() => setSourceType('shared')} className={`rounded-full px-3 py-1 ${sourceType === 'shared' ? 'bg-cyan-400 text-slate-950' : 'border border-white/20 text-slate-200'}`}>Shared slip/text</button>
      </div>

      <Surface className="space-y-4">
        {parsedReview === null ? (
          <>
            <label className="block text-sm font-medium text-slate-200" htmlFor="slip-text">Ticket selections</label>
            <textarea
              id="slip-text"
              className="h-40 w-full rounded-lg border border-default bg-canvas p-3 font-mono text-sm"
              value={slipText}
              onChange={(event) => { setSlipText(event.target.value); setParsedReview(null); setReviewAcknowledged(false); }}
              placeholder="Upload a screenshot, or paste each leg on a new line"
            />
            <input ref={fileInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => { void onFileChange(event); }} />
            {ocrProgress !== null ? <p className="text-sm text-slate-300">{ocrProgress}</p> : null}
            {ocrError ? <p role="alert" className="text-sm text-danger">{ocrError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button intent="secondary" onClick={onUploadClick} disabled={loading || isOcrRunning || xrayLoading}>Upload screenshot</Button>
              {isOcrRunning ? <Button intent="secondary" onClick={() => void onCancelOcr()}>Cancel OCR</Button> : null}
              <Button intent="primary" onClick={() => void onReviewSelections()} disabled={loading || isOcrRunning || xrayLoading || !slipText.trim()}>
                {xrayLoading ? 'Reading selections…' : 'Review selections'}
              </Button>
            </div>
            <p className="text-xs leading-5 text-slate-400">Your screenshot is processed on your device and is not automatically uploaded. Extracted text is sent to ResearchBets when you review it.</p>
          </>
        ) : (
          <>
            <ParsedSlipReview legs={parsedReview} onChange={(next) => { setParsedReview(next); setReviewAcknowledged(false); }} />
            <label className="flex items-start gap-3 rounded-xl border border-white/10 p-3 text-sm leading-6 text-slate-200">
              <input type="checkbox" className="mt-1.5 h-5 w-5 shrink-0 accent-cyan-300" checked={reviewAcknowledged} onChange={(event) => setReviewAcknowledged(event.target.checked)} />
              <span>I checked every selection against my ticket, including missing legs and corrected values.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button intent="secondary" onClick={editRawText} disabled={loading}>Edit recognized text</Button>
              <Button intent="primary" onClick={() => void onConfirmAndAnalyze()} disabled={loading || !reviewAcknowledged || reviewTicketIssues(parsedReview).length > 0}>
                {loading ? 'Opening X-Ray…' : 'Confirm and see X-Ray'}
              </Button>
            </div>
            {reviewTicketIssues(parsedReview).length ? <p role="status" className="text-xs text-amber-100">Complete the highlighted fields before confirming the ticket.</p> : null}
          </>
        )}
        {status ? <p role="status" className="text-sm text-slate-300">{status}</p> : null}
        {artifactStatus ? <p className="text-xs text-slate-400">{artifactStatus}</p> : null}
      </Surface>rface>

      <section className="rounded-xl border border-white/15 bg-white/5 p-3">
        <p className="text-xs text-slate-300">Other paths</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/cockpit'), { mode: 'demo' })}>Try sample slip</Link>
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/history'), {})}>Open history</Link>
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/today'), { tab: 'board' })}>Build from Board</Link>
        </div>
      </section>


    </div>
  );
}
