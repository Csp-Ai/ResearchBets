'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';

import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { appendQuery } from '@/src/components/landing/navigation';
import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { CockpitHeader } from '@/src/components/cockpit/CockpitHeader';
import { CockpitShell } from '@/src/components/cockpit/CockpitShell';
import { AliveEmptyState } from '@/src/components/ui/AliveEmptyState';
import {
  REVIEW_DEMO_SAMPLE_NAME,
  REVIEW_DEMO_SAMPLE_TEXT,
  type ReviewPostMortemResult,
  runReviewIngestion
} from '@/src/core/control/reviewIngestion';
import { buildShareRunHref } from '@/src/core/trace/shareHref';

const ReviewPanel = dynamic(() => import('./ReviewPanel').then((m) => m.ReviewPanel), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
      Loading review panel…
    </div>
  )
});

type Tab = 'live' | 'review';

export function ControlPageClient() {
  const search = useSearchParams();
  const initialTab = search.get('tab') === 'review' ? 'review' : 'live';
  const [tab, setTab] = useState<Tab>(initialTab);
  const { slip, slip_id: draftSlipId, trace_id: draftTraceId } = useDraftSlip();
  const nervous = useNervousSystem();
  const [outcome, setOutcome] = useState<'win' | 'loss' | 'push'>('loss');
  const [postmortem, setPostmortem] = useState<ReviewPostMortemResult | null>(null);
  const [retroDto, setRetroDto] = useState<ResearchRunDTO | null>(null);
  const [reviewInputLabel, setReviewInputLabel] = useState('');
  const [reviewMode, setReviewMode] = useState<'live' | 'demo' | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'running'>('idle');
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [latestTrace, setLatestTrace] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [reviewText, setReviewText] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const riskDelta = useMemo(() => {
    if (slip.length === 0) return 0;
    const avg = slip.reduce((sum, leg) => sum + (leg.confidence ?? 0.58), 0) / slip.length;
    return Math.round((avg - 0.6) * 100);
  }, [slip]);

  const runReview = useCallback(
    async ({
      text,
      mode,
      sourceHint,
      inputLabel
    }: {
      text: string;
      mode: 'paste' | 'screenshot' | 'demo';
      sourceHint: 'paste' | 'screenshot' | 'demo';
      inputLabel: string;
    }) => {
      setReviewStatus('running');
      setReviewError(null);
      setOcrStatus(null);
      try {
        const [{ runSlip }, { runStore }, { toResearchRunDTOFromRun }] = await Promise.all([
          import('@/src/core/pipeline/runSlip'),
          import('@/src/core/run/store'),
          import('@/src/core/run/researchRunDTO')
        ]);
        const result = await runReviewIngestion({
          text,
          outcome,
          mode,
          sourceHint,
          inputLabel,
          continuity: {
            trace_id: draftTraceId ?? nervous.trace_id,
            slip_id: draftSlipId
          }
        },
          { runSlip, runStore, toResearchRunDTOFromRun }
        );

        setRetroDto(result.dto);
        setReviewInputLabel(result.inputLabel);
        setReviewMode(result.mode === 'demo' ? 'demo' : 'live');
        setPostmortem(result.postmortem);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'rb:last-postmortem',
            JSON.stringify({
              inputLabel: result.inputLabel,
              mode: result.mode,
              dto: result.dto,
              payload: result.postmortem
            })
          );
        }
      } catch (error) {
        setRetroDto(null);
        setPostmortem(null);
        setReviewMode(mode === 'demo' ? 'demo' : 'live');
        setReviewInputLabel(inputLabel);
        setReviewError(error instanceof Error ? error.message : 'Review ingestion failed.');
      } finally {
        setReviewStatus('idle');
      }
    },
    [draftSlipId, draftTraceId, nervous.trace_id, outcome]
  );

  const onUploadReviewFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      setReviewError(null);

      try {
        setOcrStatus('Reading screenshot…');
        const { runOcr } = await import('@/src/features/ingest/ocr/ocrClient');
        const text = await runOcr(file, (progress) => setOcrStatus(progress));
        setReviewText(text);
        await runReview({
          text,
          mode: 'screenshot',
          sourceHint: 'screenshot',
          inputLabel: file.name
        });
      } catch (error) {
        setReviewError(
          error instanceof Error
            ? error.message
            : 'Could not read the screenshot. Try another image or paste your slip manually.'
        );
      } finally {
        setOcrStatus(null);
      }
    },
    [runReview]
  );

  useEffect(() => {
    void import('@/src/core/run/store')
      .then(({ runStore }) => runStore.listRuns(1))
      .then((runs) => setLatestTrace(runs[0]?.trace_id ?? null));
  }, []);

  useEffect(() => {
    if (search.get('sample') === '1' && tab === 'review' && !retroDto) {
      void runReview({
        text: REVIEW_DEMO_SAMPLE_TEXT,
        mode: 'demo',
        sourceHint: 'demo',
        inputLabel: REVIEW_DEMO_SAMPLE_NAME
      });
    }
  }, [retroDto, runReview, search, tab]);

  const shareRun = useCallback(async () => {
    const shareHref = buildShareRunHref(nervous, retroDto?.trace_id ?? latestTrace);
    if (!shareHref || typeof navigator === 'undefined' || !navigator.clipboard) {
      setShareStatus('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareHref);
      setShareStatus('done');
      window.setTimeout(() => setShareStatus('idle'), 1200);
    } catch {
      setShareStatus('error');
    }
  }, [latestTrace, nervous, retroDto?.trace_id]);

  return (
    <CockpitShell>
      <CockpitHeader
        title="Control Room"
        purpose="After loop: track live posture, review outcomes, and feed back process fixes."
        ctas={
          <>
            <Link
              href={nervous.toHref('/today')}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/5"
            >
              Build from Board
            </Link>
            {latestTrace ? (
              <Link
                href={appendQuery(nervous.toHref('/stress-test'), {
                  trace_id: latestTrace,
                  slip_id: draftSlipId
                })}
                className="rounded-lg border border-cyan-300/60 bg-cyan-400 px-3 py-1.5 text-sm text-slate-950"
              >
                Open latest run
              </Link>
            ) : null}
            <Link
              href={appendQuery(nervous.toHref('/stress-test'), { demo: '1' })}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/5"
            >
              Try sample slip (demo)
            </Link>
          </>
        }
        strip={{ mode: nervous.mode, traceId: latestTrace ?? nervous.trace_id }}
      />

      <div className="flex gap-2 rounded-xl bg-slate-900/70 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('live')}
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'live' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => setTab('review')}
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'review' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
        >
          Review
        </button>
      </div>

      {tab === 'live' ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Control Room: Live</h2>
          <SlipIntelBar legs={slip} />
          {slip.length === 0 ? (
            <>
              <AliveEmptyState
                title="No active run yet"
                message="Open latest run, try a deterministic sample, or build from Board to start live tracking."
                actions={
                  <>
                    {latestTrace ? (
                      <Link
                        href={appendQuery(nervous.toHref('/stress-test'), {
                          trace_id: latestTrace,
                          slip_id: draftSlipId
                        })}
                        className="rounded bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950"
                      >
                        Open latest run
                      </Link>
                    ) : null}
                    <Link
                      href={appendQuery(nervous.toHref('/stress-test'), { demo: '1' })}
                      className="rounded border border-white/20 px-3 py-2 text-sm"
                    >
                      Try sample slip (demo)
                    </Link>
                    <Link
                      href={nervous.toHref('/today')}
                      className="rounded border border-white/20 px-3 py-2 text-sm"
                    >
                      Build from Board
                    </Link>
                  </>
                }
              />
              <section className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                <h3 className="text-sm font-semibold text-slate-100">Run timeline</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Demo sample: Scout submitted → legs extracted → weakest-leg note recorded.
                </p>
              </section>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300">
                Pregame → live confidence delta:{' '}
                <span className={riskDelta >= 0 ? 'text-emerald-300' : 'text-amber-300'}>
                  {riskDelta >= 0 ? '+' : ''}
                  {riskDelta}%
                </span>
              </p>
              <ul className="space-y-2 text-sm">
                {slip.map((leg) => (
                  <li
                    key={leg.id}
                    className="rounded-lg border border-white/10 bg-slate-950/50 p-3"
                  >
                    <p className="font-medium">
                      {leg.player} {leg.marketType} {leg.line} {leg.odds ?? ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      Game status: Monitoring • Risk shift:{' '}
                      {riskDelta >= 0 ? 'stable/up' : 'watchlist'} • Hedge:{' '}
                      {riskDelta < -5 ? 'consider' : 'not needed'}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {tab === 'review' ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Review</h2>
          <p className="text-sm text-slate-300">
            Review a real slip by pasting ticket text or uploading a screenshot. The default
            path runs OCR/parse + extract before postmortem. Demo review stays separate below.
          </p>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Review input</span>
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                className="h-28 w-full rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-100"
                placeholder="Paste the real slip text you want to review…"
              />
            </label>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => {
                  void onUploadReviewFile(event);
                }}
                hidden
              />
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as 'win' | 'loss' | 'push')}
                className="rounded border border-white/20 bg-slate-950 px-2 py-2 text-sm"
              >
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="push">Push</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  void runReview({
                    text: reviewText,
                    mode: 'paste',
                    sourceHint: 'paste',
                    inputLabel: 'Pasted review input'
                  })
                }
                disabled={reviewStatus === 'running' || !reviewText.trim()}
                className="rounded bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reviewStatus === 'running' ? 'Running review…' : 'Run real review'}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={reviewStatus === 'running'}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/5 disabled:opacity-60"
              >
                Upload screenshot
              </button>
              <button
                type="button"
                onClick={() =>
                  void runReview({
                    text: REVIEW_DEMO_SAMPLE_TEXT,
                    mode: 'demo',
                    sourceHint: 'demo',
                    inputLabel: REVIEW_DEMO_SAMPLE_NAME
                  })
                }
                disabled={reviewStatus === 'running'}
                className="rounded border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 disabled:opacity-60"
              >
                Run demo sample review
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Default review keeps the current bettor-loop continuity by reusing trace_id{' '}
            {draftTraceId ?? nervous.trace_id ?? 'when available'} and slip_id{' '}
            {draftSlipId ?? 'when available'}.
          </p>
          {ocrStatus ? <p className="text-xs text-slate-300">{ocrStatus}</p> : null}
          {reviewError ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              <p className="font-medium">Real review could not be parsed.</p>
              <p className="mt-1">{reviewError}</p>
              <p className="mt-1 text-xs text-rose-100/80">
                You can edit the input and retry, or choose “Run demo sample review” for the
                clearly labeled sample flow.
              </p>
            </div>
          ) : null}

          <ReviewPanel
            retroDto={retroDto}
            uploadName={reviewInputLabel}
            reviewMode={reviewMode}
            postmortem={postmortem}
            shareStatus={shareStatus}
            onShare={() => void shareRun()}
          />
          {postmortem ? (
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs">
                Postmortem card preview ready.
              </div>
              <button
                type="button"
                className="rounded-lg border border-white/20 bg-slate-950/50 p-3 text-xs text-left"
              >
                Rebuild without weakest legs
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/20 bg-slate-950/50 p-3 text-xs text-left"
              >
                Log journal note
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </CockpitShell>
  );
}
