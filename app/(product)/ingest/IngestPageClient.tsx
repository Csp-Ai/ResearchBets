'use client';

import React, { useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';

import { appendQuery } from '@/src/components/landing/navigation';
import { parseSlipSubmitEnvelope } from '@/src/core/slips/apiAdapters';
import { withTraceId } from '@/src/core/trace/queryTrace';
import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';

const DEFAULT_SLIP = 'NBA\nJayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)';

export default function IngestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = useMemo(() => searchParams.get('prefill') ?? DEFAULT_SLIP, [searchParams]);
  const [slipText, setSlipText] = useState(prefill);
  const [sourceType, setSourceType] = useState<'self' | 'shared'>('self');
  const nervous = useNervousSystem();
  const [loading, setLoading] = useState(false);
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
      setSubmittedSlipId(parsed.data.data.slip_id ?? null);
      setSubmittedTraceId(parsed.data.data.trace_id ?? null);
      setHasHistoricalDate(/\b(202[0-5]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(slipText));
      setStatus(parsed.data.data.parse?.needs_review ? 'Saved. Parsing confidence is low, confirm legs next.' : 'Saved and parsed. Next action is ready.');
    } catch (submitError) {
      setStatus(submitError instanceof Error ? submitError.message : 'Unable to submit slip.');
    } finally {
      setLoading(false);
    }
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
    setArtifactStatus('Saving original upload to bettor history…');
    const abortController = new AbortController();
    ocrAbortControllerRef.current = abortController;

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('artifact_type', artifactType);
      const uploadResponse = await fetch('/api/bettor-memory/upload', { method: 'POST', body: form });
      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (uploadResponse.ok && uploadPayload?.artifact?.artifact_id) {
        setArtifactStatus('Saved to bettor history. Running demo parser contract next.');
        const parseResponse = await fetch('/api/bettor-memory/parse-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifact_id: uploadPayload.artifact.artifact_id, artifact_type: artifactType, raw_text: slipText, source_sportsbook: null })
        });
        const parsePayload = await parseResponse.json().catch(() => ({}));
        if (parseResponse.ok) setArtifactStatus('Saved to bettor history. Parsed with partial confidence. Unverified fields require review.');
        else setArtifactStatus(parsePayload?.error ?? 'Upload saved, but parser contract did not complete.');
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
    <div className="mx-auto max-w-3xl space-y-4 py-4 pb-24 md:py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Upload slip</h1>
        <p className="text-sm text-slate-300">Paste your old slip or someone else&apos;s text. We save first, parse second, and keep flow moving.</p>
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
        <textarea className="h-56 w-full rounded-lg border border-default bg-canvas p-3 font-mono text-xs" value={slipText} onChange={(event) => setSlipText(event.target.value)} placeholder="Paste each leg on a new line" />
        <input ref={fileInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => { void onFileChange(event); }} />
        {ocrProgress !== null ? <p className="text-sm text-slate-300">{ocrProgress}</p> : null}
        {status ? <p className="text-sm text-slate-300">{status}</p> : null}
        {artifactStatus ? <p className="text-sm text-slate-300">{artifactStatus}</p> : null}
        {ocrError ? <p className="text-sm text-danger">{ocrError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button intent="secondary" onClick={onUploadClick} disabled={loading || isOcrRunning}>Upload screenshot</Button>
          {isOcrRunning ? <Button intent="secondary" onClick={() => void onCancelOcr()}>Cancel OCR</Button> : null}
          <Button intent="primary" onClick={() => void onSubmit()} disabled={loading || isOcrRunning || !slipText.trim()}>{loading ? 'Saving…' : 'Save slip'}</Button>
        </div>
      </Surface>

      <section className="rounded-xl border border-white/15 bg-white/5 p-3">
        <p className="text-xs text-slate-300">Alive actions</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/cockpit'), { mode: 'demo' })}>Try sample slip</Link>
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/history'), {})}>Open latest run</Link>
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/today'), { tab: 'board' })}>Build from Board</Link>
          <Link className="rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/ingest'), {})}>Upload slip</Link>
        </div>
      </section>

      {submittedSlipId ? (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/95 p-3">
          <div className="mx-auto flex max-w-3xl gap-2">
            {hasHistoricalDate ? (
              <Button intent="primary" onClick={() => void router.push(appendQuery(nervous.toHref('/history'), { settle: submittedSlipId }))}>
                Run settle
              </Button>
            ) : (
              <Button intent="primary" onClick={() => void router.push(withTraceId(nervous.toHref('/research'), submittedTraceId ?? nervous.trace_id ?? ''))}>
                Analyze now
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
