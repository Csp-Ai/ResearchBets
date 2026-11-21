'use client';

import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import { useDraftSlip } from '@/src/hooks/useDraftSlip';
import { appendQuery } from '@/src/components/landing/navigation';
import { Button } from '@/src/components/ui/button';
import { Surface } from '@/src/components/ui/surface';
import { SUPPORTED_MARKET_TYPES, type MarketType } from '@/src/core/markets/marketType';
import type { TrackedTicket, TrackedTicketLeg } from '@/src/core/track/types';

type ParseTextResponse = {
  ok: boolean;
  data?: TrackedTicket;
  error?: { message?: string };
};
type TicketStatus = 'proposed' | 'placed' | 'live' | 'settled' | 'unknown';
const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const LEAGUES = ['Unknown', 'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'Other'] as const;

function keyForLeg(leg: TrackedTicketLeg): string {
  return [
    leg.player.trim().toLowerCase(), leg.marketType, leg.threshold,
    leg.direction, (leg.teams ?? leg.gameId ?? '').trim().toLowerCase()
  ].join('|');
}

function cleanParsedLegs(legs: TrackedTicketLeg[]): TrackedTicketLeg[] {
  const seen = new Set<string>();
  return legs.filter((leg) => {
    // Deduplicate a repeated OCR row, never different thresholds for one player.
    if (leg.player === 'Needs review' || !(leg.gameId || leg.teams)) return true;
    const key = keyForLeg(leg);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((leg, index) => ({
    ...leg, legId: 'leg-' + (index + 1), needsReview: Boolean(leg.needsReview)
  }));
}

function reviewProblem(leg: TrackedTicketLeg): string | null {
  if (!leg.player.trim() || leg.player === 'Needs review') return 'Player or team is missing';
  if (!leg.league || leg.league === 'Unknown') return 'Sport/league needs review';
  if (!SUPPORTED_MARKET_TYPES.includes(leg.marketType)) return 'Market is unsupported';
  if (leg.marketLabel === 'Needs review') return 'Market needs review';
  if (!Number.isFinite(leg.threshold) || leg.threshold < 0) return 'Threshold is missing';
  if (leg.odds && !/^[+-](?:[1-9]\d{2,4})$/.test(leg.odds)) return 'Odds are invalid. Clear them if unreadable';
  return null;
}

export default function IngestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nervous = useNervousSystem();
  const { replaceState } = useDraftSlip();
  const fromBender = searchParams.get('entry') === 'bender';
  const prefill = useMemo(() => searchParams.get('prefill') ?? '', [searchParams]);
  const [slipText, setSlipText] = useState(prefill);
  const [rawExtractedText, setRawExtractedText] = useState('');
  const [origin, setOrigin] = useState<'screenshot' | 'paste'>('paste');
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('proposed');
  const [parsedCandidate, setParsedCandidate] = useState<TrackedTicketLeg[]>([]);
  const [reviewedLegs, setReviewedLegs] = useState<TrackedTicketLeg[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveOriginal, setSaveOriginal] = useState(false);
  const [sourceArtifactId, setSourceArtifactId] = useState<string | undefined>();
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const uploadInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const ocrWorkerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);
  const ocrControllerRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<string[]>([]);
  const identityRef = useRef<{ slipId?: string; traceId?: string }>({});

  useEffect(() => () => {
    ocrControllerRef.current?.abort();
    void ocrWorkerRef.current?.terminate().catch(() => undefined);
    urlsRef.current.forEach((url) => URL.revokeObjectURL?.(url));
  }, []);

  const parseForReview = async (text: string, source: 'screenshot' | 'paste') => {
    if (!text.trim()) { setError('Add a screenshot or paste ticket text first.'); return; }
    setIsReading(true);
    setError(null);
    try {
      if (!identityRef.current.slipId) identityRef.current.slipId = crypto.randomUUID();
      if (!identityRef.current.traceId) identityRef.current.traceId = nervous.trace_id ?? crypto.randomUUID();
      const response = await fetch('/api/slips/parseText', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text, sourceHint: source, slip_id: identityRef.current.slipId,
          trace_id: identityRef.current.traceId
        })
      });
      const payload = await response.json().catch(() => ({})) as ParseTextResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? 'Could not recognize the ticket.');
      }
      const candidate = cleanParsedLegs(payload.data.legs);
      setParsedCandidate(candidate.map((leg) => ({ ...leg })));
      setReviewedLegs(candidate);
      setConfirmedIds([]);
      setHasParsed(true);
      setOrigin(source);
      if (!candidate.length || candidate.every((leg) => leg.player === 'Needs review')) {
        setNotice('No reliable selections found. Compare the screenshot, correct the text, or add each missing leg below.');
      } else {
        setNotice('Compare every leg with your original screenshot. Nothing is verified until you review it.');
      }
    } catch (caught) {
      setHasParsed(false);
      setError(caught instanceof Error ? caught.message : 'Ticket extraction failed. Paste or edit the text manually.');
    } finally {
      setIsReading(false);
    }
  };

  const persistOriginal = async (file: File): Promise<string | undefined> => {
    // Saving is never implicit. Anonymous users may always run OCR locally.
    if (!saveOriginal) return undefined;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('artifact_type', 'slip_screenshot');
      const response = await fetch('/api/bettor-memory/upload', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(
        response.status === 401 ? 'Sign in to save the original screenshot. Local analysis is still available.'
        : payload.error ?? 'Original image could not be saved.'
      );
      return typeof payload.artifact?.artifact_id === 'string' ? payload.artifact.artifact_id : undefined;
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Image saving unavailable. Continuing locally.');
      return undefined;
    }
  };

  const onFilesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (files.length > MAX_SCREENSHOTS) {
      setError('Choose up to four screenshots for one ticket.');
      return;
    }
    if (files.some((file) => !ACCEPTED_IMAGES.has(file.type) || file.size > MAX_SCREENSHOT_BYTES || file.size === 0)) {
      setError('Choose PNG, JPEG, or WebP images up to 8 MB each. Convert HEIC before uploading.');
      return;
    }
    ocrControllerRef.current?.abort();
    const controller = new AbortController();
    ocrControllerRef.current = controller;
    setError(null); setNotice(null); setIsOcrRunning(true);
    setHasParsed(false); setReviewedLegs([]); setParsedCandidate([]); setConfirmedIds([]);
    setTicketStatus('proposed'); setSourceArtifactId(undefined);
    setOrigin('screenshot');
    urlsRef.current.forEach((url) => URL.revokeObjectURL?.(url));
    const urls = files.map((file) => typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '');
    urlsRef.current = urls.filter(Boolean);
    setPreviewUrls(urls.filter(Boolean));

    try {
      const { runOcr } = await import('@/src/features/ingest/ocr/ocrClient');
      const parts: string[] = [];
      for (const [index, file] of files.entries()) {
        if (controller.signal.aborted) return;
        setOcrProgress('Screenshot ' + (index + 1) + ' of ' + files.length);
        const extracted = await runOcr(file, (progress) => setOcrProgress(
          'Screenshot ' + (index + 1) + '/' + files.length + ': ' + progress
        ), {
          signal: controller.signal, onWorkerChange: (worker) => { ocrWorkerRef.current = worker; }
        });
        parts.push(extracted);
        const artifactId = await persistOriginal(file);
        if (artifactId) setSourceArtifactId(artifactId);
      }
      if (controller.signal.aborted) return;
      const allText = parts.join('\n');
      setRawExtractedText(allText);
      setSlipText(allText);
      await parseForReview(allText, 'screenshot');
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : 'Could not read the screenshot. Edit or paste the ticket text.');
      }
    } finally {
      if (ocrControllerRef.current === controller) ocrControllerRef.current = null;
      setIsOcrRunning(false); setOcrProgress(null); ocrWorkerRef.current = null;
    }
  };

  const onCancelOcr = () => {
    ocrControllerRef.current?.abort();
    void ocrWorkerRef.current?.terminate().catch(() => undefined);
    setIsOcrRunning(false);
    setOcrProgress(null);
    setError('OCR canceled. Your screenshots remain available for reference; paste the ticket text or try again.');
  };

  const updateLeg = (legId: string, patch: Partial<TrackedTicketLeg>) => {
    setReviewedLegs((current) => current.map((leg) => leg.legId === legId
      ? { ...leg, ...patch, needsReview: false } : leg
    ));
    setConfirmedIds((current) => current.filter((id) => id !== legId));
  };

  const addMissingLeg = () => {
    const id = 'manual-' + crypto.randomUUID();
    setReviewedLegs((current) => [...current, {
      legId: id, league: 'Unknown', player: '', marketType: 'points',
      marketLabel: 'Needs review', threshold: -1, direction: 'over',
      source: 'manual_review', parseConfidence: 'low', needsReview: true
    }]);
    setHasParsed(true);
    setConfirmedIds((current) => current.filter((candidate) => candidate !== id));
  };

  const onAnalyze = () => {
    setError(null);
    if (!reviewedLegs.length) {
      setError('No ticket legs to analyze. Add or review a selection.'); return;
    }
    const unconfirmed = reviewedLegs.filter((leg) => !confirmedIds.includes(leg.legId));
    const invalid = reviewedLegs.map((leg) => reviewProblem(leg)).filter(Boolean);
    if (invalid.length || unconfirmed.length) {
      setError('Review every leg before analysis. ' + (invalid[0] ?? 'Confirm all selections against the screenshot.'));
      return;
    }
    const slipId = identityRef.current.slipId ?? crypto.randomUUID();
    const traceId = identityRef.current.traceId ?? nervous.trace_id ?? crypto.randomUUID();
    identityRef.current = { slipId, traceId };
    const timestamp = new Date().toISOString();
    replaceState({
      slip_id: slipId,
      trace_id: traceId,
      legs: reviewedLegs.map((leg) => ({
        id: leg.legId, player: leg.player, marketType: leg.marketType,
        line: leg.ladder ? String(leg.threshold) + '+' :
          (leg.direction === 'under' ? 'Under ' : 'Over ') + leg.threshold,
        odds: leg.odds || undefined, game: leg.teams ?? leg.gameId
      })),
      ingestion: {
        origin, userTicketStatus: ticketStatus,
        rawExtractedText: origin === 'screenshot' ? rawExtractedText : slipText,
        parsedCandidate: parsedCandidate.map((leg) => ({
          legId: leg.legId, rawText: leg.rawText, player: leg.player,
          league: leg.league, marketType: leg.marketType,
          threshold: leg.threshold, odds: leg.odds
        })),
        confirmedLegs: reviewedLegs.map((leg) => ({
          legId: leg.legId, league: leg.league, player: leg.player,
          marketType: leg.marketType, threshold: leg.threshold,
          direction: leg.direction, odds: leg.odds, teams: leg.teams
        })),
        confirmedAt: timestamp, sourceArtifactId
      }
    });
    // Only a reviewed draft is created. No bet placement, settlement or historical performance record.
    const leagues = new Set(reviewedLegs.map((leg) => leg.league));
    const sport = leagues.size === 1 ? reviewedLegs[0]?.league : nervous.sport;
    router.push(nervous.toHref('/stress-test', { sport, slip_id: slipId, trace_id: traceId }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 pb-24 sm:px-5 md:py-8">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/60">
          {fromBender ? 'Bender / ResearchBets' : 'ResearchBets'} · Screenshot → Review → X-Ray
        </p>
        <h1 className="text-3xl font-semibold">Upload Your Parlay</h1>
        <p className="text-sm text-slate-300">Upload a potential ticket, verify what OCR recognized, and understand its weakest structure. A screenshot does not prove a bet was placed.</p>
      </header>

      <Surface className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button intent="primary" onClick={() => uploadInput.current?.click()} disabled={isOcrRunning || isReading}>
            Upload Your Parlay
          </Button>
          <Button intent="secondary" onClick={() => cameraInput.current?.click()} disabled={isOcrRunning || isReading}>
            Take a picture
          </Button>
        </div>
        <input ref={uploadInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event) => { void onFilesChange(event); }} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { void onFilesChange(event); }} />
        <p className="text-xs text-slate-400">PNG, JPEG or WebP · up to four screenshots · max 8 MB each. HEIC needs conversion. Camera availability depends on your browser.</p>
        <label className="flex items-start gap-2 text-xs text-slate-300">
          <input type="checkbox" className="mt-1" checked={saveOriginal} onChange={(event) => setSaveOriginal(event.target.checked)} />
          <span>Save original screenshots to my signed-in history (optional). Otherwise OCR runs locally and original images are not uploaded.</span>
        </label>
        {previewUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {previewUrls.map((url, index) => (
              <img key={url} src={url} alt={'Original screenshot ' + (index + 1)} className="max-h-56 w-full rounded-lg border border-white/15 object-contain" />
            ))}
          </div>
        ) : null}
        {ocrProgress ? <p className="text-sm text-slate-300" role="status">{ocrProgress}</p> : null}
        {isOcrRunning ? <Button intent="secondary" onClick={onCancelOcr}>Cancel OCR</Button> : null}
        <div className="space-y-2">
          <label htmlFor="rb-ocr-text" className="block text-sm font-semibold">Extracted text or pasted ticket</label>
          <textarea
            id="rb-ocr-text" rows={6} maxLength={20_000}
            className="w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-sm text-slate-100"
            placeholder="Upload screenshots, or paste each leg on a new line"
            value={slipText}
            onChange={(event) => {
              setSlipText(event.target.value);
              setHasParsed(false); setConfirmedIds([]); setReviewedLegs([]);
              setOrigin(previewUrls.length ? 'screenshot' : 'paste');
            }}
          />
          <p className="text-xs text-slate-400">OCR may miss rows or confuse player names, odds and alternate lines. Compare against the image and add missing legs yourself.</p>
          <Button intent="secondary" disabled={isOcrRunning || isReading || !slipText.trim()} onClick={() => {
            void parseForReview(slipText, origin);
          }}>{isReading ? 'Reading ticket…' : 'Review extracted ticket'}</Button>
        </div>
      </Surface>

      {hasParsed ? (
        <Surface className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-100/60">02 / CONFIRM THE TICKET</p>
            <h2 className="mt-2 text-xl font-semibold">Your Ticket · {reviewedLegs.length} legs</h2>
            <p className="mt-1 text-xs text-slate-300">Parser-derived candidates are not provider-verified facts. Correct and confirm each row before analyzing.</p>
          </div>
          <label htmlFor="rb-ticket-status" className="block text-sm">
            What is the ticket status? (your confirmation)
          </label>
          <select id="rb-ticket-status" value={ticketStatus} onChange={(event) => setTicketStatus(event.target.value as TicketStatus)}
            className="w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-sm">
            <option value="proposed">Potential ticket · not placed</option>
            <option value="placed">Placed · outcome not verified</option>
            <option value="live">In progress · outcome not verified</option>
            <option value="settled">Settled · outcome needs review</option>
            <option value="unknown">Status unknown</option>
          </select>
          {reviewedLegs.map((leg, index) => {
            const problem = reviewProblem(leg);
            const checked = confirmedIds.includes(leg.legId);
            return (
              <section key={leg.legId} className="min-w-0 space-y-3 rounded-xl border border-white/15 bg-white/[0.035] p-3" aria-label={'Leg ' + (index + 1)}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Leg {index + 1}</h3>
                  <button type="button" className="min-h-11 px-2 text-xs text-rose-200" onClick={() => {
                    setReviewedLegs((current) => current.filter((item) => item.legId !== leg.legId));
                    setConfirmedIds((current) => current.filter((id) => id !== leg.legId));
                  }}>Remove spurious row</button>
                </div>
                {leg.rawText ? <p className="break-words rounded bg-slate-900 p-2 text-xs text-slate-400">OCR: {leg.rawText}</p> : <p className="text-xs text-slate-400">Manually added leg</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs">Player / team
                    <input className="mt-1 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-sm"
                      value={leg.player} onChange={(event) => updateLeg(leg.legId, { player: event.target.value })} />
                  </label>
                  <label className="block text-xs">League
                    <select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm" value={LEAGUES.includes(leg.league as typeof LEAGUES[number]) ? leg.league : 'Unknown'}
                      onChange={(event) => updateLeg(leg.legId, { league: event.target.value })}>
                      {LEAGUES.map((league) => <option key={league} value={league}>{league}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs">Market
                    <select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm"
                      value={leg.marketType}
                      onChange={(event) => updateLeg(leg.legId, { marketType: event.target.value as MarketType, marketLabel: event.target.value.replace(/_/g, ' ') })}>
                      {SUPPORTED_MARKET_TYPES.map((market) => <option key={market} value={market}>{market.replace(/_/g, ' ')}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs">Event / matchup (if known)
                    <input className="mt-1 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-sm" value={leg.teams ?? ''}
                      onChange={(event) => updateLeg(leg.legId, { teams: event.target.value, gameId: undefined })} placeholder="Unknown" />
                  </label>
                  <label className="block text-xs">Direction
                    <select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm" value={leg.direction}
                      onChange={(event) => updateLeg(leg.legId, { direction: event.target.value as 'over' | 'under' })}>
                      <option value="over">Over / at least</option><option value="under">Under</option>
                    </select>
                  </label>
                  <label className="block text-xs">Threshold
                    <input type="number" min="0" step="any" className="mt-1 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-sm"
                      value={leg.threshold < 0 ? '' : leg.threshold}
                      onChange={(event) => updateLeg(leg.legId, { threshold: event.target.value === '' ? -1 : Number(event.target.value) })} />
                  </label>
                  <label className="block text-xs">American odds (optional / unknown)
                    <input className="mt-1 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-sm"
                      placeholder="Unknown" inputMode="numeric" value={leg.odds ?? ''}
                      onChange={(event) => updateLeg(leg.legId, { odds: event.target.value })} />
                  </label>
                </div>
                <p className="text-xs text-slate-400">Source: {leg.source} · Parser confidence: {leg.parseConfidence}. Odds are from the screenshot, not current verified prices.</p>
                {problem ? <p className="text-xs text-amber-200" role="status">{problem}</p> : null}
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={checked} disabled={Boolean(problem)} onChange={(event) => setConfirmedIds((current) => event.target.checked
                    ? [...current.filter((id) => id !== leg.legId), leg.legId]
                    : current.filter((id) => id !== leg.legId))} />
                  Confirm leg {index + 1} against original
                </label>
              </section>
            );
          })}
          <Button intent="secondary" onClick={addMissingLeg}>+ Add missing leg</Button>
          <p className="text-xs text-slate-400">{confirmedIds.length} of {reviewedLegs.length} legs confirmed. Missing prices remain unknown; no payout is inferred.</p>
          <Button intent="primary" onClick={onAnalyze} disabled={isReading || isOcrRunning}>Analyze My Ticket</Button>
          <p className="text-xs text-slate-400">Creates a reviewed research draft, not a wager or verified betting-history record. Ticket X-Ray remains the canonical engine.</p>
        </Surface>
      ) : null}

      {notice ? <p className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-slate-300" role="status">{notice}</p> : null}
      {error ? <p className="rounded-lg border border-rose-400/40 bg-rose-950/20 p-3 text-sm text-rose-200" role="alert">{error}</p> : null}

      <section className="rounded-xl border border-white/15 bg-white/5 p-3">
        <p className="text-xs text-slate-300">Other ways to research</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link className="inline-flex min-h-11 items-center rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/slip'), {})}>Build manually</Link>
          <Link className="inline-flex min-h-11 items-center rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/today'), { tab: 'board' })}>Discover + Build</Link>
          <Link className="inline-flex min-h-11 items-center rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/history'), {})}>Reviewed history</Link>
        </div>
      </section>
    </div>
  );
}
