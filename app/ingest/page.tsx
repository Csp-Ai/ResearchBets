'use client';

import React, { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { runSlip } from '@/src/core/pipeline/runSlip';
import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';

const DEFAULT_SLIP = 'Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)\nLeBron James over 6.5 rebounds (-105)';

const normalizeOcrText = (rawText: string): string => {
  return rawText
    .replace(/\r/g, '\n')
    .replace(/[•●◦▪▸►]/g, '\n')
    .replace(/\t+/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
};

export default function IngestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = useMemo(() => searchParams.get('prefill') ?? DEFAULT_SLIP, [searchParams]);
  const [slipText, setSlipText] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrWorker, setOcrWorker] = useState<{ terminate: () => Promise<unknown> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const traceId = await runSlip(slipText);
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
    if (!ocrWorker) return;
    await ocrWorker.terminate();
    setOcrWorker(null);
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

    setOcrProgress(0);
    setOcrError(null);

    let worker: { recognize: (image: File) => Promise<{ data: { text?: string } }>; terminate: () => Promise<unknown> } | null = null;

    try {
      const tesseract = await import('tesseract.js');
      worker = await tesseract.createWorker('eng', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text' && typeof message.progress === 'number') {
            setOcrProgress(Math.round(message.progress * 100));
          }
        }
      });
      setOcrWorker(worker);
      const result = await worker.recognize(file);

      const normalized = normalizeOcrText(result.data.text ?? '');
      if (!normalized) {
        setOcrError('Could not read enough text from the screenshot. Try another image or edit the text manually.');
        return;
      }

      setSlipText(normalized);
    } catch {
      setOcrError('Could not read the screenshot. Try another image or paste your slip manually.');
    } finally {
      if (worker) {
        await worker.terminate();
      }
      setOcrWorker(null);
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
        {ocrProgress !== null ? <p className="text-sm text-slate-300">Reading text… {ocrProgress}%</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {ocrError ? <p className="text-sm text-danger">{ocrError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button intent="secondary" onClick={onUploadClick} disabled={loading || ocrWorker !== null}>Upload screenshot</Button>
          {ocrWorker ? <Button intent="secondary" onClick={() => void onCancelOcr()}>Cancel OCR</Button> : null}
          <Button intent="primary" onClick={() => void onSubmit()} disabled={loading || ocrWorker !== null || !slipText.trim()}>
            {loading ? 'Analyzing…' : 'Analyze now'}
          </Button>
        </div>
      </Surface>
    </div>
  );
}
