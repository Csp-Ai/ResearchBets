'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { appendQuery } from '@/src/components/landing/navigation';
import { useNervousSystem } from '@/src/components/nervous/NervousSystemContext';
import type { AccountActivityImportRecord, ArtifactReviewRecord, ParsedSlipLegRecord, ParsedSlipRecord, SlipStatus } from '@/src/core/bettor-memory/types';

type ReviewPayload = {
  ok?: boolean;
  detail?: ArtifactReviewRecord;
  message?: string;
  error?: string;
};

type DraftSlip = Pick<ParsedSlipRecord, 'slip_id' | 'sportsbook' | 'placed_at' | 'settled_at' | 'stake' | 'payout' | 'potential_payout' | 'odds' | 'status' | 'sport' | 'league' | 'confidence_score' | 'parse_quality' | 'verification_status' | 'raw_source_reference'> & { legs: DraftSlipLeg[] };
type DraftSlipLeg = Pick<ParsedSlipLegRecord, 'leg_id' | 'player_name' | 'team_name' | 'market_type' | 'line' | 'over_under_or_side' | 'odds' | 'result' | 'event_descriptor' | 'sport' | 'league' | 'confidence_score' | 'normalized_market_label'>;
type DraftActivity = Pick<AccountActivityImportRecord, 'activity_import_id' | 'source_sportsbook' | 'beginning_balance' | 'end_balance' | 'deposited' | 'played_staked' | 'won_returned' | 'withdrawn' | 'rebated' | 'promotions_awarded' | 'promotions_played' | 'promotions_expired' | 'bets_placed' | 'bets_won' | 'activity_window_start' | 'activity_window_end' | 'verification_status' | 'parse_quality' | 'confidence_score'>;
type DraftDetail = { artifact: ArtifactReviewRecord['artifact']; review: ArtifactReviewRecord['review']; slip: DraftSlip | null; accountActivity: DraftActivity | null };

const inputClassName = 'w-full rounded border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const labelClassName = 'space-y-1 text-xs uppercase tracking-wide text-slate-400';

const numberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function toDraft(detail: ArtifactReviewRecord): DraftDetail {
  return {
    artifact: detail.artifact,
    review: detail.review,
    slip: detail.slip ? {
      slip_id: detail.slip.slip_id,
      sportsbook: detail.slip.sportsbook,
      placed_at: detail.slip.placed_at,
      settled_at: detail.slip.settled_at,
      stake: detail.slip.stake,
      payout: detail.slip.payout,
      potential_payout: detail.slip.potential_payout,
      odds: detail.slip.odds,
      status: detail.slip.status,
      sport: detail.slip.sport,
      league: detail.slip.league,
      confidence_score: detail.slip.confidence_score,
      parse_quality: detail.slip.parse_quality,
      verification_status: detail.slip.verification_status,
      raw_source_reference: detail.slip.raw_source_reference,
      legs: detail.slip.legs.map((leg) => ({
        leg_id: leg.leg_id,
        player_name: leg.player_name,
        team_name: leg.team_name,
        market_type: leg.market_type,
        line: leg.line,
        over_under_or_side: leg.over_under_or_side,
        odds: leg.odds,
        result: leg.result,
        event_descriptor: leg.event_descriptor,
        sport: leg.sport,
        league: leg.league,
        confidence_score: leg.confidence_score,
        normalized_market_label: leg.normalized_market_label,
      })),
    } : null,
    accountActivity: detail.accountActivity ? {
      activity_import_id: detail.accountActivity.activity_import_id,
      source_sportsbook: detail.accountActivity.source_sportsbook,
      beginning_balance: detail.accountActivity.beginning_balance,
      end_balance: detail.accountActivity.end_balance,
      deposited: detail.accountActivity.deposited,
      played_staked: detail.accountActivity.played_staked,
      won_returned: detail.accountActivity.won_returned,
      withdrawn: detail.accountActivity.withdrawn,
      rebated: detail.accountActivity.rebated,
      promotions_awarded: detail.accountActivity.promotions_awarded,
      promotions_played: detail.accountActivity.promotions_played,
      promotions_expired: detail.accountActivity.promotions_expired,
      bets_placed: detail.accountActivity.bets_placed,
      bets_won: detail.accountActivity.bets_won,
      activity_window_start: detail.accountActivity.activity_window_start,
      activity_window_end: detail.accountActivity.activity_window_end,
      verification_status: detail.accountActivity.verification_status,
      parse_quality: detail.accountActivity.parse_quality,
      confidence_score: detail.accountActivity.confidence_score,
    } : null,
  };
}

export default function ArtifactReviewPage() {
  const params = useParams<{ artifactId: string }>();
  const nervous = useNervousSystem();
  const artifactId = params.artifactId;
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'needs_review' | 'rejected'>('verified');
  const [saveState, setSaveState] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/bettor-memory/artifacts/${artifactId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: ReviewPayload) => {
        if (!data.detail) {
          setSaveState(data.error ?? 'Artifact review could not be loaded.');
          return;
        }
        const nextDraft = toDraft(data.detail);
        setDraft(nextDraft);
        setVerificationStatus(data.detail.review.verification_status === 'verified' ? 'verified' : 'needs_review');
      });
  }, [artifactId]);

  const isSlip = Boolean(draft?.slip);
  const unknownHint = useMemo(() => 'Leave a field blank when the screenshot is ambiguous. Unknown stays explicit and reviewable.', []);

  const updateSlip = <K extends keyof DraftSlip>(key: K, value: DraftSlip[K]) => setDraft((current) => current && current.slip ? { ...current, slip: { ...current.slip, [key]: value } } : current);
  const updateActivity = <K extends keyof DraftActivity>(key: K, value: DraftActivity[K]) => setDraft((current) => current && current.accountActivity ? { ...current, accountActivity: { ...current.accountActivity, [key]: value } } : current);
  const updateLeg = <K extends keyof DraftSlipLeg>(index: number, key: K, value: DraftSlipLeg[K]) => setDraft((current) => current && current.slip ? {
    ...current,
    slip: {
      ...current.slip,
      legs: current.slip.legs.map((leg, legIndex) => legIndex === index ? { ...leg, [key]: value } : leg),
    },
  } : current);

  const addLeg = () => setDraft((current) => current && current.slip ? ({
    ...current,
    slip: {
      ...current.slip,
      legs: [...current.slip.legs, { leg_id: `new-${Date.now()}`, player_name: null, team_name: null, market_type: null, line: null, over_under_or_side: null, odds: null, result: 'unknown', event_descriptor: null, sport: current.slip.sport, league: current.slip.league, normalized_market_label: null, confidence_score: current.slip.confidence_score }],
    },
  }) : current);

  const removeLeg = (index: number) => setDraft((current) => current && current.slip ? ({
    ...current,
    slip: {
      ...current.slip,
      legs: current.slip.legs.filter((_, legIndex) => legIndex !== index),
    },
  }) : current);

  const onSave = async () => {
    if (!draft) return;
    setSaveState('Saving review…');
    const response = await fetch(`/api/bettor-memory/artifacts/${artifactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_status: verificationStatus, review_notes: reviewNotes || null, slip: draft.slip ?? undefined, accountActivity: draft.accountActivity ?? undefined }),
    });
    const data: ReviewPayload = await response.json();
    if (!response.ok || !data.detail) {
      setSaveState(data?.error ?? 'Review save failed.');
      return;
    }
    setDraft(toDraft(data.detail));
    setSaveState(data.message ?? 'Review saved.');
  };

  return (
    <section className="mx-auto max-w-6xl space-y-4 py-4 pb-24">
      <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Artifact review</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100">Review uploaded artifact</h1>
        <p className="mt-2 text-sm text-slate-300">Raw screenshot, parser output, and bettor-reviewed fields live together so trust stays explicit.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-100">Original screenshot</p>
              <p className="text-xs text-slate-400">{draft?.artifact?.artifact_type?.replace(/_/g, ' ')} · {draft?.artifact?.source_sportsbook ?? 'Sportsbook unknown'}</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">{draft?.artifact?.verification_status}</span>
          </div>
          {draft?.artifact?.preview_url ? (
            <div className="relative min-h-[24rem] w-full overflow-hidden rounded-xl border border-white/10">
              <Image src={draft.artifact.preview_url} alt="Uploaded betting artifact" fill unoptimized className="object-contain" />
            </div>
          ) : <div className="rounded-xl border border-dashed border-white/15 p-8 text-sm text-slate-400">Secure preview unavailable in this environment, but the artifact remains private.</div>}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            <p className="font-medium text-slate-100">Parser truth label</p>
            <p className="mt-1">{draft?.review?.review_reason}</p>
            <p className="mt-2">Parser: {draft?.review?.parser_adapter ? draft.review.parser_adapter.replace(/_/g, ' ') : 'pending'} · Confidence: {draft?.review?.parser_confidence_label} {draft?.review?.parser_confidence != null ? `(${Math.round(draft.review.parser_confidence * 100)}%)` : ''}</p>
            <p className="mt-2">Recommended next state: {draft?.review?.recommended_next_state ?? 'needs_review'}</p>
            {draft?.review?.parser_warnings?.length ? <ul className="mt-2 list-disc space-y-1 pl-4">{draft.review.parser_warnings.slice(0, 3).map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}</ul> : null}
            {draft?.review?.parser_errors?.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-200">{draft.review.parser_errors.slice(0, 2).map((error, index) => <li key={`${error.code}-${index}`}>{error.message}</li>)}</ul> : null}
            <p className="mt-2">{unknownHint}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            <p className="font-medium text-slate-100">Raw extracted text</p>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-slate-300">{draft?.artifact?.raw_extracted_text ?? 'No OCR text stored for this artifact yet.'}</pre>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className={labelClassName}><span>Verification state</span><select className={inputClassName} value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value as 'verified' | 'needs_review' | 'rejected')}><option value="verified">Verified</option><option value="needs_review">Needs review</option><option value="rejected">Rejected</option></select></label>
            <label className={labelClassName}><span>Review notes</span><input className={inputClassName} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Optional bettor-facing note" /></label>
          </div>

          {isSlip && draft?.slip ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  ['sportsbook', draft.slip.sportsbook ?? ''],
                  ['placed_at', draft.slip.placed_at ?? ''],
                  ['settled_at', draft.slip.settled_at ?? ''],
                  ['stake', draft.slip.stake ?? ''],
                  ['payout', draft.slip.payout ?? ''],
                  ['potential_payout', draft.slip.potential_payout ?? ''],
                  ['odds', draft.slip.odds ?? ''],
                  ['status', draft.slip.status],
                  ['sport', draft.slip.sport ?? ''],
                  ['league', draft.slip.league ?? ''],
                ] as const).map(([key, value]) => (
                  <label key={key} className={labelClassName}>
                    <span>{key.replace(/_/g, ' ')}</span>
                    {key === 'status' ? (
                      <select className={inputClassName} value={value} onChange={(event) => updateSlip(key, event.target.value as SlipStatus)}>
                        {['open', 'won', 'lost', 'pushed', 'cashed_out', 'partial', 'unknown'].map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input className={inputClassName} value={String(value ?? '')} onChange={(event) => updateSlip(key, (['stake', 'payout', 'potential_payout', 'odds'].includes(key) ? numberOrNull(event.target.value) : event.target.value || null) as DraftSlip[typeof key])} />
                    )}
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">Slip legs</h2>
                  <button type="button" className="rounded border border-white/20 px-3 py-2 text-xs text-slate-200" onClick={addLeg}>Add leg</button>
                </div>
                {draft.slip.legs.map((leg, index) => (
                  <article key={leg.leg_id ?? index} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-100">Leg {index + 1}</p>
                      <button type="button" className="text-xs text-rose-300" onClick={() => removeLeg(index)}>Remove</button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {(['player_name', 'team_name', 'market_type', 'line', 'over_under_or_side', 'odds', 'result', 'event_descriptor', 'sport', 'league', 'normalized_market_label'] as const).map((key) => (
                        <label key={key} className={labelClassName}>
                          <span>{key.replace(/_/g, ' ')}</span>
                          {key === 'result' ? (
                            <select className={inputClassName} value={leg[key] ?? 'unknown'} onChange={(event) => updateLeg(index, key, event.target.value as DraftSlipLeg[typeof key])}>
                              {['unknown', 'won', 'lost', 'pushed'].map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          ) : (
                            <input className={inputClassName} value={String(leg[key] ?? '')} onChange={(event) => updateLeg(index, key, (['line', 'odds'].includes(key) ? numberOrNull(event.target.value) : event.target.value || null) as DraftSlipLeg[typeof key])} />
                          )}
                        </label>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {draft?.accountActivity ? (
            <div className="grid gap-3 md:grid-cols-2">
              {(['source_sportsbook', 'beginning_balance', 'end_balance', 'deposited', 'played_staked', 'won_returned', 'withdrawn', 'rebated', 'promotions_awarded', 'promotions_played', 'promotions_expired', 'bets_placed', 'bets_won', 'activity_window_start', 'activity_window_end'] as const).map((key) => (
                <label key={key} className={labelClassName}>
                  <span>{key.replace(/_/g, ' ')}</span>
                  <input className={inputClassName} value={String(draft.accountActivity?.[key] ?? '')} onChange={(event) => updateActivity(key, (['source_sportsbook', 'activity_window_start', 'activity_window_end'].includes(key) ? event.target.value || null : numberOrNull(event.target.value)) as DraftActivity[typeof key])} />
                </label>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/95 p-3">
        <div className="mx-auto flex max-w-6xl gap-2">
          <button type="button" className="flex-1 rounded bg-cyan-400 px-3 py-2 text-center text-sm font-semibold text-slate-950" onClick={() => void onSave()}>Save review</button>
          <Link className="flex-1 rounded border border-white/20 px-3 py-2 text-center text-sm" href={appendQuery(nervous.toHref('/history'), {})}>Back to archive</Link>
        </div>
        {saveState ? <p className="mx-auto mt-2 max-w-6xl text-sm text-slate-300">{saveState}</p> : null}
      </div>
    </section>
  );
}
