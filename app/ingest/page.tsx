'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { runSlip } from '@/src/core/pipeline/runSlip';
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
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button intent="primary" onClick={() => void onSubmit()} disabled={loading || !slipText.trim()}>
          {loading ? 'Analyzing…' : 'Analyze now'}
        </Button>
      </Surface>
    </div>
  );
}
