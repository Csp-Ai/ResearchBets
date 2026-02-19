'use client';

import React, { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { runSlip } from '@/src/core/pipeline/runSlip';
import { runOcr } from '@/src/features/ingest/ocr/ocrClient';
import { readCoverageAgentEnabled } from '@/src/core/ui/preferences';
import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';

const DEFAULT_SLIP = 'Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)\nLeBron James over 6.5 rebounds (-105)';

export default function IngestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = useMemo(() => searchParams.get('prefill') ?? DEFAULT_SLIP, [searchParams]);
  const [slipText, setSlipText] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const ocrWorkerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);
  const ocrAbortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const traceId = await runSlip(slipText, { coverageAgentEnabled: readCoverageAgentEnabled() });
      router.push(`/research?trace=${encodeURIComponent(traceId)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to run analysis.');
    } finally {
      setLoading(false);
    }
  };

  const onUploadClick = () => {
    setOcrError(null);
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
    const abortController = new AbortController();
    ocrAbortControllerRef.current = abortController;

    try {
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
    <div className="mx-auto max-w-3xl space-y-6 py-4 md:py-8">
      <header className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold">Paste Slip</h1>
        <p className="text-sm text-slate-400">Drop your ticket text, parse legs instantly, and jump to analyze.</p>
      </header>

      <Surface className="space-y-4">
        <textarea
          className="h-64 w-full rounded-lg border border-default bg-canvas p-3 font-mono text-xs"
          value={slipText}
          onChange={(event) => setSlipText(event.target.value)}
          placeholder="Paste each leg on a new line"
        />
        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/png,image/jpeg"
          onChange={(event) => {
            void onFileChange(event);
          }}
        />
        {ocrProgress !== null ? <p className="text-sm text-slate-300">{ocrProgress}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {ocrError ? <p className="text-sm text-danger">{ocrError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button intent="secondary" onClick={onUploadClick} disabled={loading || isOcrRunning}>Upload screenshot</Button>
          {isOcrRunning ? <Button intent="secondary" onClick={() => void onCancelOcr()}>Cancel OCR</Button> : null}
          <Button intent="primary" onClick={() => void onSubmit()} disabled={loading || isOcrRunning || !slipText.trim()}>
            {loading ? 'Analyzing…' : 'Analyze now'}
          </Button>
        </div>
      </Surface>
    </div>
  );
}
