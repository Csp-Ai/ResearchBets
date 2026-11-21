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
import { inspectScreenshotTicket, screenshotCoverage, type ScreenshotTicketMetadata } from '@/src/core/track/screenshotTicketMetadata';
import { summarizeScreenshotPreflight } from '@/src/core/track/screenshotPreflight';

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
const SPORTSBOOKS = ['Unknown', 'FanDuel', 'DraftKings', 'PrizePicks', 'Kalshi', 'Other'] as const;

function detectSportsbook(rawText: string): string {
  const found = [
    /\bfan\s*duel\b/i.test(rawText) ? 'FanDuel' : null,
    /\bdraft\s*kings\b/i.test(rawText) ? 'DraftKings' : null,
    /\bprize\s*picks\b/i.test(rawText) ? 'PrizePicks' : null,
    /\bkalshi\b/i.test(rawText) ? 'Kalshi' : null
  ].filter(Boolean);
  return found.length === 1 ? found[0]! : 'Unknown';
}

function keyForLeg(leg: TrackedTicketLeg): string {
  return [
    leg.player.trim().toLowerCase(), leg.marketType, leg.threshold,
    leg.direction, (leg.teams ?? leg.gameId ?? '').trim().toLowerCase()
  ].join('|');
}

function cleanParsedLegs(legs: TrackedTicketLeg[]): TrackedTicketLeg[] {
  // Preserve every OCR candidate. Identical selections on two screenshots may
  // be duplicate captures, but may also represent two intentionally distinct
  // wagers. Only the user can remove or confirm a row.
  return legs.map((leg, index) => ({
    ...leg,
    legId: 'leg-' + (index + 1),
    needsReview: Boolean(leg.needsReview)
  }));
}

function duplicateOf(leg: TrackedTicketLeg, index: number, legs: TrackedTicketLeg[]): number {
  if (!leg.player.trim() || leg.player === 'Needs review') return -1;
  const key = keyForLeg(leg);
  return legs.findIndex((item, earlier) =>
    earlier < index && item.player !== 'Needs review' && keyForLeg(item) === key
  );
}

function reviewProblem(leg: TrackedTicketLeg): string | null {
  if (!leg.player.trim() || leg.player === 'Needs review') return 'Player or team is missing';
  if (!leg.league || leg.league === 'Unknown') return 'Sport/league needs review';
  if (!SUPPORTED_MARKET_TYPES.includes(leg.marketType)) return 'Market is unsupported';
  if (leg.marketLabel === 'Needs review') return 'Market needs review';
  if (leg.unsupportedMarket) return 'This contract requires a dedicated market adapter; a generic prop interpretation is unsafe.';
  if (leg.directionObserved === false) return 'Direction was not visible. Choose Over or Under to confirm.';
  if (leg.thresholdObserved === false) return 'Threshold was not visible. Enter the exact line to confirm.';
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
  const [showText, setShowText] = useState(Boolean(prefill));
  const [rawExtractedText, setRawExtractedText] = useState('');
  const [origin, setOrigin] = useState<'screenshot' | 'paste'>('paste');
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('proposed');
  const [ticketMetadata, setTicketMetadata] = useState<ScreenshotTicketMetadata | null>(null);
  const [observedSportsbook, setObservedSportsbook] = useState('Unknown');
  const [selectedSportsbook, setSelectedSportsbook] = useState('Unknown');
  const [parsedCandidate, setParsedCandidate] = useState<TrackedTicketLeg[]>([]);
  const [reviewedLegs, setReviewedLegs] = useState<TrackedTicketLeg[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [failedScreenshots, setFailedScreenshots] = useState<number[]>([]);
  const [failedScreenshotsReviewed, setFailedScreenshotsReviewed] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingNotice, setSavingNotice] = useState<string | null>(null);
  const [saveOriginal, setSaveOriginal] = useState(false);
  const [sourceArtifactId, setSourceArtifactId] = useState<string | undefined>();
  const [sourceArtifactIds, setSourceArtifactIds] = useState<string[]>([]);
  const [canRetry, setCanRetry] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const uploadInput = useRef<HTMLInputElement | null>(null);
  const replacementInput = useRef<HTMLInputElement | null>(null);
  const replacementIndex = useRef(0);
  const filesRef = useRef<File[]>([]);
  const extractedByFile = useRef(new Map<File, string>());
  const savedByFile = useRef(new Map<File, string>());
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

  const parseForReview = async (text: string, source: 'screenshot' | 'paste', screenshotParts?: Array<{ text: string; imageIndex: number }>, signal?: AbortSignal) => {
    if (!text.trim()) { setError('Add a screenshot or paste ticket text first.'); return; }
    setIsReading(true);
    setError(null);
    try {
      if (!identityRef.current.slipId) identityRef.current.slipId = crypto.randomUUID();
      if (!identityRef.current.traceId) identityRef.current.traceId = nervous.trace_id ?? crypto.randomUUID();
      const segments = source === 'screenshot' && screenshotParts?.length
        ? screenshotParts : [{ text, imageIndex: 0 }];
      const responses = await Promise.allSettled(segments.map(async (segment) => {
        const response = await fetch('/api/slips/parseText', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
          body: JSON.stringify({
            text: segment.text, sourceHint: source, slip_id: identityRef.current.slipId,
            trace_id: identityRef.current.traceId
          })
        });
        const payload = await response.json().catch(() => ({})) as ParseTextResponse;
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error?.message ?? 'Could not recognize the complete ticket.');
        }
        return payload.data.legs.map((leg) => ({
          ...leg, sourceScreenshotIndex: source === 'screenshot' && screenshotParts ? segment.imageIndex : undefined
        }));
      }));
      if (signal?.aborted) return;
      const successful = responses.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
      const failed = responses.flatMap((result, index) =>
        result.status === 'rejected' && segments[index]?.imageIndex ? [segments[index].imageIndex] : []
      );
      if (responses.every((result) => result.status === 'rejected')) {
        setCanRetry(source === 'screenshot' && filesRef.current.length > 0);
        throw new Error('Could not read the ticket selections. Edit the text or retry.');
      }
      if (failed.length) {
        setFailedScreenshots((current) => [...new Set([...current, ...failed])].sort((a, b) => a - b));
        setFailedScreenshotsReviewed(false);
        setCanRetry(true);
      }
      const candidate = cleanParsedLegs(successful);
      setTicketMetadata(inspectScreenshotTicket(text));
      setParsedCandidate(candidate.map((leg) => ({ ...leg })));
      const observed = detectSportsbook(text);
      setObservedSportsbook(observed);
      setSelectedSportsbook(observed);
      setReviewedLegs(candidate);
      setConfirmedIds([]);
      setHasParsed(true);
      setOrigin(source);
      if (candidate.some((leg, i) => duplicateOf(leg, i, candidate) >= 0)) {
        setNotice('Possible repeated rows detected. Compare each screenshot and remove duplicates yourself; no leg was deleted.');
      } else if (!candidate.length || candidate.every((leg) => leg.player === 'Needs review')) {
        setNotice('No reliable selections found. Compare the screenshot, correct the text, or add each missing leg below.');
      } else {
        setNotice(null);
      }
    } catch (caught) {
      if (signal?.aborted) return;
      setHasParsed(false);
      setError(caught instanceof Error ? caught.message : 'Ticket extraction failed. Paste or edit the text manually.');
    } finally {
      if (!signal?.aborted) setIsReading(false);
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
      setSavingNotice(caught instanceof Error ? caught.message : 'Image saving unavailable. Continuing locally.');
      return undefined;
    }
  };

  const readScreenshots = async (files: File[]) => {
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
    filesRef.current = files;
    for (const cachedFile of extractedByFile.current.keys()) {
      if (!files.includes(cachedFile)) extractedByFile.current.delete(cachedFile);
    }
    for (const savedFile of savedByFile.current.keys()) {
      if (!files.includes(savedFile)) savedByFile.current.delete(savedFile);
    }
    const controller = new AbortController();
    ocrControllerRef.current = controller;
    setError(null); setNotice(null); setSavingNotice(null); setIsOcrRunning(true); setCanRetry(false);
    setSlipText(''); setRawExtractedText(''); setShowText(false);
    setHasParsed(false); setReviewedLegs([]); setParsedCandidate([]); setConfirmedIds([]);
    setTicketStatus('proposed'); setTicketMetadata(null); setSourceArtifactId(undefined); setSourceArtifactIds([]);
    setFailedScreenshots([]); setFailedScreenshotsReviewed(false);
    setObservedSportsbook('Unknown'); setSelectedSportsbook('Unknown');
    setOrigin('screenshot');
    urlsRef.current.forEach((url) => URL.revokeObjectURL?.(url));
    const urls = files.map((file) => typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '');
    urlsRef.current = urls.filter(Boolean);
    setPreviewUrls(urls.filter(Boolean));

    try {
      const { runOcr } = await import('@/src/features/ingest/ocr/ocrClient');
      const parts: Array<{text: string; imageIndex: number}> = [];
      const savedIds: string[] = [];
      const failedIndexes: number[] = [];
      for (const [index, file] of files.entries()) {
        if (controller.signal.aborted) return;
        setOcrProgress('Screenshot ' + (index + 1) + ' of ' + files.length);
        try {
          const extracted = extractedByFile.current.get(file) ?? await runOcr(file, (progress) => {
            if (!controller.signal.aborted) setOcrProgress('Screenshot ' + (index + 1) + '/' + files.length + ': ' + progress);
          }, {
            signal: controller.signal,
            onWorkerChange: (worker) => {
              if (ocrControllerRef.current === controller) ocrWorkerRef.current = worker;
            }
          });
          if (controller.signal.aborted) return;
          extractedByFile.current.set(file, extracted);
          parts.push({ text: extracted, imageIndex: index + 1 });
        } catch {
          if (controller.signal.aborted) return;
          failedIndexes.push(index + 1);
        }
        if (controller.signal.aborted) return;
        const artifactId = savedByFile.current.get(file) ?? await persistOriginal(file);
        if (artifactId && filesRef.current.includes(file)) savedByFile.current.set(file, artifactId);
        if (controller.signal.aborted) return;
        if (artifactId) { savedIds.push(artifactId); setSourceArtifactId(artifactId); }
      }
      if (controller.signal.aborted) return;
      setFailedScreenshots(failedIndexes);
      setCanRetry(failedIndexes.length > 0);
      setFailedScreenshotsReviewed(false);
      setSourceArtifactIds(savedIds);
      if (parts.length === 0) {
        setError('None of the screenshots could be read. Paste ticket text or try a clearer image.');
        return;
      }
      const allText = parts.map((part) => part.text).join('\n');
      setRawExtractedText(allText);
      setSlipText(allText);
      await parseForReview(allText, 'screenshot', parts, controller.signal);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : 'Could not read the screenshot. Edit or paste the ticket text.');
      }
    } finally {
      if (ocrControllerRef.current === controller) {
        ocrControllerRef.current = null;
        setIsOcrRunning(false); setOcrProgress(null); ocrWorkerRef.current = null;
      }
    }
  };

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>, replaceIndex?: number) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selected.length) return;
    const files = replaceIndex === undefined
      ? selected
      : filesRef.current.map((file, index) => index === replaceIndex ? selected[0]! : file);
    void readScreenshots(files);
  };

  const onCancelOcr = () => {
    ocrControllerRef.current?.abort();
    void ocrWorkerRef.current?.terminate().catch(() => undefined);
    ocrControllerRef.current = null;
    ocrWorkerRef.current = null;
    setIsOcrRunning(false);
    setIsReading(false);
    setCanRetry(true);
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
      marketLabel: 'Needs review', threshold: -1, thresholdObserved: false, direction: 'over', directionObserved: false,
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
    const completeness = ticketMetadata ? screenshotCoverage(ticketMetadata, reviewedLegs.length) : null;
    if (completeness?.incomplete) {
      setError(completeness.note ?? 'The screenshot ticket is incomplete. Review its declared count and missing selections.');
      return;
    }
    if (ticketMetadata && (ticketMetadata.pricingKind !== 'american_odds' ||
        ticketMetadata.declaredCountConflict || ticketMetadata.format === 'unknown')) {
      setError('This ticket uses specialized contract or combination pricing. You can review its extracted selections, but canonical X-Ray analysis is paused until the appropriate pricing adapter is validated. No conventional parlay odds will be fabricated.');
      return;
    }
    if (failedScreenshots.length && !failedScreenshotsReviewed) {
      setError('Some screenshots could not be read. Compare them and confirm any missing selections were added.'); return;
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
        observedSportsbook, userSelectedSportsbook: selectedSportsbook,
        rawExtractedText: origin === 'screenshot' ? rawExtractedText : slipText,
        parsedCandidate: parsedCandidate.map((leg) => ({
          legId: leg.legId, rawText: leg.rawText, sourceScreenshotIndex: leg.sourceScreenshotIndex, player: leg.player,
          league: leg.league, marketType: leg.marketType,
          threshold: leg.threshold, odds: leg.odds
        })),
        confirmedLegs: reviewedLegs.map((leg) => ({
          legId: leg.legId, sourceScreenshotIndex: leg.sourceScreenshotIndex, league: leg.league, player: leg.player,
          marketType: leg.marketType, threshold: leg.threshold,
          direction: leg.direction, odds: leg.odds, teams: leg.teams
        })),
        confirmedAt: timestamp, sourceArtifactId, sourceArtifactIds
      }
    });
    // Only a reviewed draft is created. No bet placement, settlement or historical performance record.
    const leagues = new Set(reviewedLegs.map((leg) => leg.league));
    const sport = leagues.size === 1 ? reviewedLegs[0]?.league : nervous.sport;
    router.push(nervous.toHref('/stress-test', { sport, slip_id: slipId, trace_id: traceId }));
  };

  const recognizedLegs = reviewedLegs.filter((leg) => leg.player.trim() && leg.player !== 'Needs review');
  const preflight = ticketMetadata ? summarizeScreenshotPreflight(ticketMetadata, recognizedLegs) : null;
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 pb-24 sm:px-5 md:py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold text-cyan-100/70">
          {fromBender ? 'Bender / ResearchBets' : 'ResearchBets'}
        </p>
        <h1 className="text-3xl font-semibold">Upload Your Parlay</h1>
        <p className="text-sm text-slate-300">Add screenshots of one ticket. Crop out chats or account details before uploading.</p>
      </header>

      <Surface className="space-y-4">
        <Button className="min-h-12 w-full" intent="primary" onClick={() => uploadInput.current?.click()} disabled={isOcrRunning || isReading}>
          Upload Your Parlay
        </Button>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button className="min-h-11" intent="secondary" onClick={() => cameraInput.current?.click()} disabled={isOcrRunning || isReading}>
            Take a picture
          </Button>
          <Button className="min-h-11" intent="secondary" aria-expanded={showText} onClick={() => setShowText(!showText)} disabled={isOcrRunning || isReading}>
            {slipText && origin === 'screenshot' ? 'Edit extracted text' : 'Paste ticket'}
          </Button>
          <Link className="inline-flex min-h-11 items-center justify-center rounded border border-white/20 px-3 py-2 text-sm" href={nervous.toHref('/slip')}>
            Build manually
          </Link>
        </div>
        <input ref={uploadInput} aria-label="Select screenshots" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event) => onFilesChange(event)} />
        <input ref={cameraInput} aria-label="Take a ticket photo" type="file" accept="image/*" capture="environment" hidden onChange={(event) => onFilesChange(event)} />
        <input ref={replacementInput} aria-label="Select cropped screenshot" type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={(event) => onFilesChange(event, replacementIndex.current)} />
        <p className="text-xs text-slate-400">Choose up to four PNG, JPEG or WebP images, up to 8 MB each.</p>
        <details className="text-xs text-slate-300">
          <summary className="min-h-11 cursor-pointer py-3">Screenshot privacy and saving</summary>
          <p className="my-2">Images stay on your device by default. Extracted text is sent to ResearchBets to find the selections.</p>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={saveOriginal} onChange={(event) => setSaveOriginal(event.target.checked)} disabled={isOcrRunning || isReading} />
            Save screenshots to my signed-in history
          </label>
        </details>
        {previewUrls.length > 0 ? (
          <details className="text-sm">
            <summary className="min-h-11 cursor-pointer py-3">View or replace screenshots ({previewUrls.length})</summary>
            <p className="mb-2 text-xs text-slate-300">In Photos, crop to the ticket to remove chats and other surrounding content. Then replace that screenshot here.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {previewUrls.map((url, index) => (
                <figure key={url} className="min-w-0 space-y-2">
                  <img src={url} alt={'Screenshot ' + (index + 1)} className="max-h-56 w-full rounded-lg border border-white/15 object-contain" />
                  <Button intent="secondary" className="min-h-11 w-full px-2" disabled={isOcrRunning || isReading} onClick={() => {
                    replacementIndex.current = index;
                    replacementInput.current?.click();
                  }}>Replace image {index + 1}</Button>
                </figure>
              ))}
            </div>
          </details>
        ) : null}
        {savingNotice ? <p className="text-sm text-amber-100" role="status">{savingNotice}</p> : null}
        {ocrProgress ? <p className="text-sm text-slate-300" role="status">{ocrProgress}</p> : null}
        {isOcrRunning ? <Button intent="secondary" onClick={onCancelOcr}>Cancel OCR</Button> : null}
        {canRetry && !isOcrRunning ? (
          <Button intent="secondary" disabled={isReading} onClick={() => { void readScreenshots(filesRef.current); }}>Retry OCR</Button>
        ) : null}
        {showText ? (
          <div className="space-y-2">
            <label htmlFor="rb-ocr-text" className="block text-sm font-semibold">{origin === 'screenshot' ? 'Extracted ticket text' : 'Paste ticket text'}</label>
            <textarea
              id="rb-ocr-text" rows={4} maxLength={20_000}
              className="w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-base text-slate-100"
              placeholder="Paste each leg on a new line"
              value={slipText}
              onChange={(event) => {
                setSlipText(event.target.value);
                setHasParsed(false); setConfirmedIds([]); setReviewedLegs([]);
                setOrigin(rawExtractedText ? 'screenshot' : 'paste');
              }}
            />
            <Button intent="secondary" disabled={isOcrRunning || isReading || !slipText.trim()} onClick={() => {
              const parts = filesRef.current.flatMap((file, index) => {
                const text = extractedByFile.current.get(file);
                return text ? [{ text, imageIndex: index + 1 }] : [];
              });
              const sourceParts = slipText === rawExtractedText ? parts
                : parts.length === 1 ? [{ text: slipText, imageIndex: parts[0]!.imageIndex }] : undefined;
              void parseForReview(slipText, origin, sourceParts);
            }}>{isReading ? 'Reading ticket…' : 'Review extracted ticket'}</Button>
          </div>
        ) : null}
        {error && !hasParsed ? <p className="rounded-lg border border-rose-400/40 bg-rose-950/20 p-3 text-sm text-rose-200" role="alert">{error}</p> : null}
      </Surface>

      {hasParsed ? (
        <Surface className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Your Ticket · {reviewedLegs.length} legs</h2>
            <p className="mt-1 text-sm text-slate-300">Check the selections against your original and correct any missing fields.</p>
            {notice ? <p className="mt-2 text-sm text-slate-300" role="status">{notice}</p> : null}
          </div>
          {ticketMetadata ? (
            <div className="space-y-2 rounded-lg border border-white/20 bg-white/[0.04] p-3">
              {preflight ? (
                <div className="space-y-1 border-b border-white/10 pb-3">
                  <h3 className="text-sm font-semibold">{preflight.title}</h3>
                  <p className="text-xs text-slate-300">{preflight.read}</p>
                  <p className="text-xs text-amber-100"><strong>Primary pressure:</strong> {preflight.primaryPressure}</p>
                  <p className="text-xs text-slate-200"><strong>Suggested next action:</strong> {preflight.nextAction}</p>
                </div>
              ) : null}
              <h3 className="text-sm font-semibold">Ticket structure</h3>
              <p className="text-xs text-slate-300">
                Detected format: {ticketMetadata.format.replace(/_/g, ' ')} ·
                Quoting: {ticketMetadata.pricingKind.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-slate-300">
                Declared selections: {ticketMetadata.declaredLegCount ?? 'Unknown'} ·
                Recognized selections: {recognizedLegs.length}
              </p>
              {ticketMetadata.cost != null ? <p className="text-xs text-slate-300">Screenshot cost: ${ticketMetadata.cost.toFixed(2)} (historical observation)</p> : null}
              {ticketMetadata.statedMaxPayout != null ? <p className="text-xs text-slate-300">Screenshot stated maximum payout: ${ticketMetadata.statedMaxPayout.toFixed(2)} (not independently verified)</p> : null}
              {ticketMetadata.officialCombinedAmericanOdds ? <p className="text-xs text-slate-300">Screenshot SGP+ combined price: {ticketMetadata.officialCombinedAmericanOdds} (not a per-leg price)</p> : null}
              {ticketMetadata.statedMultiplier != null ? <p className="text-xs text-slate-300">Screenshot displayed multiplier: {ticketMetadata.statedMultiplier}× (terms unverified)</p> : null}
              {ticketMetadata.warnings.map((warning, index) => (
                <p key={index} className="text-xs text-amber-100">{warning}</p>
              ))}
              {ticketMetadata.pricingKind !== 'american_odds' || ticketMetadata.format === 'unknown' ? (
                <p className="text-xs text-amber-200">Review-only mode: specialized ticket pricing and conventional X-Ray calculations are not enabled for this format.</p>
              ) : null}
            </div>
          ) : null}
          <label htmlFor="rb-sportsbook" className="block text-sm">
            Sportsbook (OCR suggestion: {observedSportsbook}, not verified)
          </label>
          <select id="rb-sportsbook" className="w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-sm"
            value={selectedSportsbook} onChange={(event) => setSelectedSportsbook(event.target.value)}>
            {SPORTSBOOKS.map((book) => <option key={book} value={book}>{book}</option>)}
          </select>
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
            const duplicateIndex = duplicateOf(leg, index, reviewedLegs);
            const checked = confirmedIds.includes(leg.legId);
            return (
              <section key={leg.legId} className="min-w-0 space-y-3 rounded-xl border border-white/15 bg-white/[0.035] p-3" aria-label={'Leg ' + (index + 1)}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="min-w-0 break-words text-sm font-semibold">Leg {index + 1}{leg.player && leg.player !== 'Needs review' ? ' · ' + leg.player : ''}</h3>
                  <button type="button" className="min-h-11 px-2 text-xs text-rose-200" onClick={() => {
                    setReviewedLegs((current) => current.filter((item) => item.legId !== leg.legId));
                    setConfirmedIds((current) => current.filter((id) => id !== leg.legId));
                  }}>Remove row</button>
                </div>
                {duplicateIndex >= 0 ? <p role="status" className="rounded-lg border border-amber-300/40 p-2 text-xs text-amber-200">Possible duplicate of leg {duplicateIndex + 1}. Compare the screenshot before keeping both.</p> : null}
                {leg.sourceScreenshotIndex ? <p className="text-xs text-slate-300">Source: screenshot {leg.sourceScreenshotIndex}</p> : null}
                {leg.rawText ? <p className="break-words rounded bg-slate-900 p-2 text-xs text-slate-400">Source text: {leg.rawText}</p> : <p className="text-xs text-slate-400">Manually added leg</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs">Player / team
                    <input className="mt-1 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-base"
                      value={leg.player} onChange={(event) => updateLeg(leg.legId, { player: event.target.value })} />
                  </label>
                  <label className="block text-xs">League
                    <select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-base" value={LEAGUES.includes(leg.league as typeof LEAGUES[number]) ? leg.league : 'Unknown'}
                      onChange={(event) => updateLeg(leg.legId, { league: event.target.value })}>
                      {LEAGUES.map((league) => <option key={league} value={league}>{league}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs">Market
                    <select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-base"
                      value={leg.marketLabel === 'Needs review' ? '' : leg.marketType}
                      onChange={(event) => updateLeg(leg.legId, { marketType: event.target.value as MarketType, marketLabel: event.target.value.replace(/_/g, ' ') })}>
                      <option value="" disabled>Choose a market</option>
                      {SUPPORTED_MARKET_TYPES.map((market) => <option key={market} value={market}>{market.replace(/_/g, ' ')}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs">Event / matchup (if known)
                    <input className="mt-1 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-base" value={leg.teams ?? ''}
                      onChange={(event) => updateLeg(leg.legId, { teams: event.target.value, gameId: undefined })} placeholder="Unknown" />
                  </label>
                  <label className="block text-xs">Direction
                    <select className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-base" value={leg.directionObserved === false ? '' : leg.direction}
                      onChange={(event) => updateLeg(leg.legId, { direction: event.target.value as 'over' | 'under', directionObserved: true })}>
                      <option value="" disabled>Choose direction</option>
                      <option value="over">Over / at least</option><option value="under">Under</option>
                    </select>
                  </label>
                  <label className="block text-xs">Threshold
                    <input type="number" min="0" step="any" className="mt-1 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-base"
                      value={leg.thresholdObserved === false || leg.threshold < 0 ? '' : leg.threshold}
                      onChange={(event) => updateLeg(leg.legId, { threshold: event.target.value === '' ? -1 : Number(event.target.value), thresholdObserved: event.target.value !== '' })} />
                  </label>
                  <label className="block text-xs">American odds (optional / unknown)
                    <input className="mt-1 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 p-3 text-base"
                      placeholder="Unknown" inputMode="numeric" value={leg.odds ?? ''}
                      onChange={(event) => updateLeg(leg.legId, { odds: event.target.value })} />
                  </label>
                </div>
                {leg.quotedContractPercent != null ? (
                  <p className="text-xs text-amber-100">Screenshot contract quote: {leg.quotedContractPercent}% · not American odds or a calibrated win probability</p>
                ) : null}
                {leg.contractSide ? <p className="text-xs text-slate-300">Contract side: {leg.contractSide.toUpperCase()}</p> : null}
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
          {failedScreenshots.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-amber-400/40 bg-amber-950/20 p-3">
              <p className="text-sm text-amber-100" role="alert">
                Could not read screenshot {failedScreenshots.join(', ')}. The ticket may be incomplete.
                Compare the originals and add or correct any missing selections.
              </p>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={failedScreenshotsReviewed}
                  onChange={(event) => setFailedScreenshotsReviewed(event.target.checked)} />
                I reviewed the unreadable screenshot(s) and added any missing legs.
              </label>
            </div>
          ) : null}
          <p className="text-xs text-slate-400">{confirmedIds.length} of {reviewedLegs.length} legs confirmed. Missing prices remain unknown; no payout is inferred.</p>
          {error ? <p className="rounded-lg border border-rose-400/40 bg-rose-950/20 p-3 text-sm text-rose-200" role="alert">{error}</p> : null}
          <Button intent="primary" onClick={onAnalyze} disabled={isReading || isOcrRunning}>Analyze My Ticket</Button>
          <p className="text-xs text-slate-400">Creates a reviewed research draft, not a wager or verified betting-history record. Ticket X-Ray remains the canonical engine.</p>
        </Surface>
      ) : null}

      <section className="rounded-xl border border-white/15 bg-white/5 p-3">
        <p className="text-xs text-slate-300">Other ways to research</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link className="inline-flex min-h-11 items-center rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/today'), { tab: 'board' })}>Discover + Build</Link>
          <Link className="inline-flex min-h-11 items-center rounded border border-white/20 px-3 py-2" href={appendQuery(nervous.toHref('/history'), {})}>Reviewed history</Link>
        </div>
      </section>
    </div>
  );
}
