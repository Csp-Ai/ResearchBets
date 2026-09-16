'use client';

import React, { useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

import { appendQuery } from '@/src/components/landing/navigation';
import { parseSlipSubmitEnvelope } from '@/src/core/slips/apiAdapters';
import type { TrackedTicket } from '@/src/core/track/types';
import { withTraceId } from '@/src/core/trace/queryTrace';
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
  const { setSlip } = useDraftSlip();
  const [loading, setLoading] = useState(false);
  const [xrayLoading, setXrayLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submittedSlipId, setSubmittedSlipId] = useState<string | null>(null);
  const [submittedTraceId, setSubmittedTraceId] = useState<string | null>(null);
  const [hasHistoricalDate, setHasHistoricalDate] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [artifactStatus, setArtifactStatus] = useState<string | null>(null);
  const [artifactType, setArtifactType] = useState<'slip_screenshot' | 'account_activity_screenshot' | 'bet_result_screenshot' | 'unknown_betting_artifact'>('slip_screenshot');
  const ocrWorkerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);
  const ocrAbortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const prepareXRay = async (slipId: string, traceId: string | null) => {
    if (!slipText.trim()) return;
    setXrayLoading(true);
    setStatus('Reading the ticket and building X-Ray…');
    try {
      const response = await fetch('/api/slips/parseText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: slipText,
          sourceHint: artifactType === 'slip_screenshot' ? 'screenshot' : 'paste',
          trace_id: traceId ?? nervous.trace_id,
          slip_id: slipId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ParseTextResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? 'Unable to prepare this slip for Ticket X-Ray.');
      }
      if (payload.data.legs.length === 0) {
        throw new Error('No verified legs were detected yet. Review the extracted text before opening X-Ray.');
      }

      setSlip(
        payload.data.legs.map((leg) => ({
          id: leg.legId,
          player: leg.player,
          marketType: leg.marketType,
          line: `${leg.direction === 'under' ? 'Under' : 'Over'} ${leg.threshold}`,
          odds: leg.odds,
          game: leg.teams ?? leg.gameId,
          volatility: leg.needsReview ? 'high' : leg.parseConfidence === 'medium' ? 'medium' : 'low',
          deadLegRisk: leg.needsReview ? 'high' : undefined,
          deadLegReasons: leg.needsReview ? ['Parser marked this leg for review before trust.'] : undefined,
        })),
      );

      const detectedSport = payload.data.legs[0]?.league === 'NFL' ? 'NFL' : nervous.sport;
      router.push(nervous.toHref('/stress-test', {
        sport: detectedSport,
        slip_id: slipId,
        trace_id: traceId ?? nervous.trace_id,
      }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to prepare Ticket X-Ray.');
    } finally {
      setXrayLoading(false);
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch('/api/slips/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: sourceType,
          source: 'paste',
          raw_text: slipText,
          spine: { sport: nervous.sport, tz: nervous.tz, date: nervous.date, mode: nervous.mode }
        })
      });
      const payload = await response.json();
      const parsed = parseSlipSubmitEnvelope(payload);
      if (!response.ok || !parsed.success || !parsed.data.ok) {
        throw new Error(parsed.success && !parsed.data.ok ? parsed.data.error.message : 'Unable to submit slip.');
      }
      const slipId = parsed.data.data.slip_id;
      const traceId = parsed.data.data.trace_id ?? null;
      setSubmittedSlipId(slipId);
      setSubmittedTraceId(traceId);
      setHasHistoricalDate(/\b(202[0-5]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(slipText));
      await prepareXRay(slipId, traceId);
    } catch (submitError) {
      setStatus(submitError instanceof Error ? submitError.message : 'Unable to submit slip.');
    } finally {
      setLoading(false);
    }
  };

  const onOpenXRay = async () => {
    if (!submittedSlipId) return;
    await prepareXRay(submittedSlipId, submittedTraceId);
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
    setArtifactStatus('Reading the screenshot locally. Sign-in is optional for analysis.');
    setSubmittedSlipId(null);
    setSubmittedTraceId(null);
    const abortController = new AbortController();
    ocrAbortControllerRef.current = abortController;
    let persistedArtifactId: string | null = null;

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('artifact_type', artifactType);
      const uploadResponse = await fetch('/api/bettor-memory/upload', { method: 'POST', body: form });
      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (uploadResponse.ok && uploadPayload?.artifact?.artifact_id) {
        persistedArtifactId = uploadPayload.artifact.artifact_id as string;
        setArtifactStatus('Original screenshot saved. Extracting text before parser analysis…');
      } else if (uploadResponse.status === 401) {
        setArtifactStatus('Not signed in — the screenshot stays local, and analysis still works normally.');
      } else {
        setArtifactStatus(uploadPayload?.error ?? 'Upload could not be persisted. Continuing with local OCR only.');
      }
    } catch {
      setArtifactStatus('Upload could not be persisted. Continuing with local OCR only.');
    }

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
      setStatus('Screenshot text extracted. Review it, then tap Analyze ticket.');

      if (persistedArtifactId) {
        setArtifactStatus('Screenshot saved. Running sportsbook parser on the extracted text…');
        const parseResponse = await fetch('/api/bettor-memory/parse-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifact_id: persistedArtifactId,
            artifact_type: artifactType,
            raw_text: normalized,
            source_sportsbook: null,
          })
        });
        const parsePayload = await parseResponse.json().catch(() => ({}));
        if (parseResponse.ok) {
          setArtifactStatus(`Saved to bettor history. Parser mode: ${parsePayload?.parser_mode ?? 'unknown'}. Review unverified fields before trusting them.`);
        } else {
          setArtifactStatus(parsePayload?.error ?? 'Screenshot saved, but parser analysis did not complete. The extracted text is still available for review.');
        }
      }
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
        <p className="text-sm text-slate-300">Upload a sportsbook screenshot or paste the text. ResearchBets preserves the source, parses the legs, then sends the reviewed structure into Ticket X-Ray.</p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={() => setSourceType('self')} className={`rounded-full px-3 py-1 ${sourceType === 'self' ? 'bg-cyan-400 text-slate-950' : 'border border-white/20 text-slate-200'}`}>My slip</button>
        <button type="button" onClick={() => setSourceType('shared')} className={`rounded-full px-3 py-1 ${sourceType === 'shared' ? 'bg-cyan-400 text-slate-950' : 'border border-white/20 text-slate-200'}`}>Shared slip/text</button>
      </div>

      <Surface className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          {(['slip_screenshot', 'account_activity_screenshot', 'bet_result_screenshot', 'unknown_betting_artifact'] as const).map((type) => (
            <button key={type} type="button" onClick={() => setArtifactType(type)} className={`rounded-full px-3 py-1 ${artifactType === type ? 'bg-cyan-400 text-slate-950' : 'border border-white/20 text-slate-200'}`}>{type.replace(/_/g, ' ')}</button>
          ))}
        </div>
        <textarea className="h-56 w-full rounded-lg border border-default bg-canvas p-3 font-mono text-xs" value={slipText} onChange={(event) => { setSlipText(event.target.value); setSubmittedSlipId(null); setSubmittedTraceId(null); }} placeholder="Upload a sportsbook screenshot, or paste each leg on a new line" />
        <input ref={fileInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => { void onFileChange(event); }} />
        {ocrProgress !== null ? <p className="text-sm text-slate-300">{ocrProgress}</p> : null}
        {status ? <p className="text-sm text-slate-300">{status}</p> : null}
        {artifactStatus ? <p className="text-sm text-slate-300">{artifactStatus}</p> : null}
        {ocrError ? <p className="text-sm text-danger">{ocrError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button intent="secondary" onClick={onUploadClick} disabled={loading || isOcrRunning || xrayLoading}>Upload screenshot</Button>
          {isOcrRunning ? <Button intent="secondary" onClick={() => void onCancelOcr()}>Cancel OCR</Button> : null}
          <Button intent="primary" onClick={() => void onSubmit()} disabled={loading || isOcrRunning || xrayLoading || !slipText.trim()}>{loading || xrayLoading ? 'Building X-Ray…' : 'Analyze ticket'}</Button>
        </div>
      </Surface>

      <section className="rounded-xl border border-white/15 bg-white/5 p-3">
        <p className="text-xs text-slate-300">Other paths</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/cockpit'), { mode: 'demo' })}>Try sample slip</Link>
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/history'), {})}>Open history</Link>
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/today'), { tab: 'board' })}>Build from Board</Link>
        </div>
      </section>

      {submittedSlipId ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/95 p-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Button intent="primary" onClick={() => void onOpenXRay()} disabled={xrayLoading}>
              {xrayLoading ? 'Building X-Ray…' : 'Open Ticket X-Ray'}
            </Button>
            {hasHistoricalDate ? (
              <Button intent="secondary" onClick={() => void router.push(appendQuery(nervous.toHref('/history'), { settle: submittedSlipId }))}>
                Run settle
              </Button>
            ) : (
              <Button intent="secondary" onClick={() => void router.push(withTraceId(nervous.toHref('/research'), submittedTraceId ?? nervous.trace_id ?? ''))}>
                Deep analysis
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
