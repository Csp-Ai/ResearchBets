'use client';

import { SlipIntelBar } from '@/src/components/slips/SlipIntelBar';
import { presentRecommendation } from '@/src/core/slips/recommendationPresentation';
import { deriveLifecycleActionGuidance } from '@/src/core/slips/lifecycleActionGuidance';
import { deriveLifecycleEvidence } from '@/src/core/slips/lifecycleEvidence';
import { deriveAfterLifecycleRisk, driverFromCauseTag } from '@/src/core/slips/lifecycleRisk';
import { rankReasons, selectTopReasons } from '@/src/core/slips/reasonRanker';
import type { ResearchRunDTO } from '@/src/core/run/researchRunDTO';

import type { ReviewPostMortemResult, ReviewProvenance } from '@/src/core/control/reviewIngestion';

const buildNextTimeAdjustments = (postmortem: ReviewPostMortemResult): string[] => {
  const topGame = postmortem.exposureSummary.topGames[0];
  const bullets: string[] = [];
  if (topGame && topGame.count >= 4)
    bullets.push(
      `${topGame.count}-leg concentration in ${topGame.game}: split across 2+ games or hedge live after first quarter.`
    );
  if (postmortem.correlationScore >= 65)
    bullets.push(
      'Correlation ran hot: trim duplicate player dependencies to lower one-script failure risk.'
    );
  if (postmortem.volatilityTier === 'High' || postmortem.volatilityTier === 'Extreme')
    bullets.push(
      `Volatility was ${postmortem.volatilityTier}: reduce alt lines/longshots before scaling stake.`
    );
  if (bullets.length === 0)
    bullets.push(
      'Keep this construction pattern; no major concentration or fragility misses in deterministic review.'
    );
  return bullets.slice(0, 3);
};

const SOURCE_LABELS: Record<ReviewProvenance['source_type'], string> = {
  pasted_text: 'Pasted text',
  screenshot_ocr: 'Screenshot OCR',
  demo_sample: 'Demo sample'
};

const PARSE_STATUS_LABELS: Record<ReviewProvenance['parse_status'], string> = {
  success: 'Parse complete',
  partial: 'Parse partial',
  failed: 'Parse failed'
};

const formatConfidence = (confidence: number | null) => {
  if (typeof confidence !== 'number') return 'Confidence unavailable';
  return confidence <= 1
    ? `${Math.round(confidence * 100)}% confidence`
    : `${Math.round(confidence)}% confidence`;
};

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function ReviewPanel({
  retroDto,
  uploadName,
  postmortem,
  provenance,
  shareStatus,
  onShare
}: {
  retroDto: ResearchRunDTO | null;
  uploadName: string;
  postmortem: ReviewPostMortemResult | null;
  provenance: ReviewProvenance | null;
  shareStatus: 'idle' | 'done' | 'error';
  onShare: () => void;
}) {
  const reviewIntelLegs =
    retroDto?.legs.map((leg) => ({
      id: leg.id,
      player: leg.player,
      selection: leg.selection,
      market: leg.market,
      line: leg.line,
      odds: leg.odds,
      team: leg.team
    })) ?? [];

  if (!retroDto || !provenance) return null;

  const postmortemReasons = selectTopReasons(
    rankReasons(retroDto.verdict.reasons, {
      correlation: retroDto.verdict.correlation_flag,
      volatility: retroDto.verdict.volatility_summary
    }),
    3
  );
  const weakestLegLabel =
    retroDto.legs.find((leg) => leg.id === retroDto.verdict.weakest_leg_id)?.selection ??
    retroDto.legs.find((leg) => leg.id === retroDto.verdict.weakest_leg_id)?.player ??
    'Unknown leg';

  const originLabel =
    provenance.source_type === 'demo_sample' ? 'Demo sample review' : 'Real parsed review';
  const continuityTraceId =
    postmortem?.attribution?.trace_id ?? provenance.trace_id ?? retroDto.trace_id ?? 'Unavailable';
  const continuitySlipId =
    postmortem?.attribution?.slip_id ?? provenance.slip_id ?? retroDto.slip_id ?? 'Unavailable';
  const attribution = postmortem?.attribution;
  const weakestLegAttribution = attribution?.weakest_leg;
  const patternSummary = postmortem?.pattern_summary;
  const inferredPregameDriver = attribution?.cause_tags?.[0]
    ? driverFromCauseTag(attribution.cause_tags[0])
    : retroDto.verdict.correlation_flag
      ? 'correlated_stack_pressure'
      : retroDto.verdict.fragility_score >= 65
        ? 'inflated_thresholds'
        : 'balanced_build';
  const afterLifecycleRisk = deriveAfterLifecycleRisk({
    causeTags: attribution?.cause_tags,
    confidenceLevel: attribution?.confidence_level,
    outcome:
      postmortem?.attribution?.outcome === 'win'
        ? 'won'
        : postmortem?.attribution?.outcome === 'loss'
          ? 'lost'
          : undefined,
    pregameDriver: inferredPregameDriver,
    liveDriver: retroDto.verdict.volatility_summary.toLowerCase().includes('high')
      ? 'volatile_secondary_stats'
      : null
  });
  const afterGuidance = deriveLifecycleActionGuidance({
    risk: afterLifecycleRisk,
    stage: 'after',
    outcome:
      postmortem?.attribution?.outcome === 'win'
        ? 'won'
        : postmortem?.attribution?.outcome === 'loss'
          ? 'lost'
        : undefined
  });
  const afterEvidence = deriveLifecycleEvidence({
    risk: afterLifecycleRisk,
    guidance: afterGuidance,
    stage: 'after',
    continuity: {
      weakest_leg_label: weakestLegAttribution?.player ?? null,
      repeated_break_pattern: Boolean(patternSummary?.common_failure_mode),
      push_void_heavy:
        postmortem?.attribution?.outcome === 'push' || postmortem?.attribution?.outcome === 'partial'
    }
  });
  const shouldShowPatternSummary = Boolean(
    patternSummary &&
    patternSummary.sample_size > 0 &&
    (attribution || patternSummary.recurring_tags.length > 0)
  );

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm space-y-2">
      <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
        <p className="font-medium">
          {originLabel} ({uploadName || 'sample'}): {retroDto.legs.length} legs
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 px-2 py-1">
            {SOURCE_LABELS[provenance.source_type]}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-1">
            {PARSE_STATUS_LABELS[provenance.parse_status]}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-1">
            {formatConfidence(provenance.parse_confidence)}
          </span>
          {provenance.had_manual_edits ? (
            <span className="rounded-full border border-cyan-400/30 px-2 py-1 text-cyan-200">
              Manual edits applied
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {provenance.source_type === 'demo_sample'
            ? 'This review came from the explicit demo sample path.'
            : 'This review came from the real review path: parse/extract → canonical slip run → postmortem.'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          trace_id: {continuityTraceId} · slip_id: {continuitySlipId}
        </p>
      </div>
      <SlipIntelBar legs={reviewIntelLegs} />
      <p>
        What happened:{' '}
        <span className="text-cyan-300">{postmortem?.classification.process ?? 'Running…'}</span>
      </p>
      <p>
        Verdict: {presentRecommendation(retroDto.verdict.decision)} · Fragility{' '}
        {retroDto.verdict.fragility_score}/100 · Correlation{' '}
        {retroDto.verdict.correlation_flag ? 'High' : 'Managed'}
      </p>
      <div className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-amber-300/20 px-2 py-1 text-[11px] text-amber-100">
            {afterLifecycleRisk.pressureLabel}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-200">
            {titleCase(afterLifecycleRisk.primaryDriver)}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-400">
            Reliability {titleCase(afterLifecycleRisk.reliability)}
          </span>
          {afterLifecycleRisk.carriedThrough ? (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-100">
              Risk carried through
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-100">{afterLifecycleRisk.headline}</p>
        <p className="mt-1 text-xs text-slate-300">{afterLifecycleRisk.detail}</p>
        <div className="mt-2 rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-100">
              Next step
            </span>
            <span className="text-sm text-cyan-100">{afterGuidance.action_label}</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">{afterGuidance.action_rationale}</p>
          {afterGuidance.continuity_note ? (
            <p className="mt-1 text-[11px] text-cyan-200/90">{afterGuidance.continuity_note}</p>
          ) : null}
        </div>
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
              Why
            </span>
            <span className="text-xs text-slate-100">{afterEvidence.primary_evidence.label}</span>
            {afterEvidence.secondary_evidence ? (
              <span className="text-xs text-slate-400">
                Also {afterEvidence.secondary_evidence.label}
              </span>
            ) : null}
          </div>
          {afterEvidence.continuity_evidence ? (
            <p className="mt-1 text-[11px] text-cyan-200/90">{afterEvidence.continuity_evidence}</p>
          ) : null}
          {afterEvidence.reliability_note ? (
            <p className="mt-1 text-[11px] text-slate-400">{afterEvidence.reliability_note}</p>
          ) : null}
        </div>
      </div>
      <p>Weakest leg: {weakestLegLabel}</p>
      <p>Volatility: {retroDto.verdict.volatility_summary}</p>
      <p>Risk flags missed: {postmortem ? postmortem.notes.join(' • ') : 'Running…'}</p>
      <ul className="list-disc pl-5 text-slate-300">
        {postmortemReasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {weakestLegAttribution ? (
        <div className="rounded-lg border border-cyan-400/20 bg-slate-900/80 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Weakest leg</p>
              <p className="font-medium text-slate-100">
                {weakestLegAttribution.player ?? 'Unknown player'}{' '}
                {weakestLegAttribution.prop_type ? `${weakestLegAttribution.prop_type}` : ''}
              </p>
              {weakestLegAttribution.expected_vs_actual ? (
                <p className="text-xs text-slate-400">
                  Current vs target: {weakestLegAttribution.expected_vs_actual}
                </p>
              ) : null}
            </div>
            <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-200">
              {titleCase(weakestLegAttribution.status)}
            </span>
          </div>
          {attribution && attribution.cause_tags.length ? (
            <div className="flex flex-wrap gap-2">
              {attribution.cause_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-200"
                >
                  {titleCase(tag)}
                </span>
              ))}
            </div>
          ) : null}
          <p className="text-sm text-slate-200">{attribution?.summary_explanation}</p>
          <p className="text-xs text-slate-500">
            Confidence: {titleCase(attribution?.confidence_level ?? 'low')}
          </p>
        </div>
      ) : null}
      {shouldShowPatternSummary ? (
        <div
          className="rounded-lg border border-amber-400/20 bg-slate-900/80 p-3 space-y-2"
          data-testid="bettor-pattern-summary"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Your patterns</p>
              <p className="text-sm text-slate-200">{patternSummary?.recommendation_summary}</p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-200">
              {patternSummary?.sample_size} reviewed{' '}
              {patternSummary?.sample_size === 1 ? 'slip' : 'slips'}
            </span>
          </div>
          {patternSummary?.recurring_tags.length ? (
            <div className="flex flex-wrap gap-2">
              {patternSummary.recurring_tags.slice(0, 3).map((item) => (
                <span
                  key={item.tag}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-200"
                >
                  {titleCase(item.tag)} · {item.count}/{patternSummary.sample_size}
                </span>
              ))}
            </div>
          ) : null}
          {patternSummary?.recent_examples.length ? (
            <ul className="list-disc pl-5 text-xs text-slate-400">
              {patternSummary.recent_examples.map((example) => (
                <li
                  key={`${example.reviewed_at}-${example.tag}-${example.trace_id ?? example.slip_id ?? example.player ?? 'example'}`}
                >
                  {example.player ?? 'Unknown player'}{' '}
                  {example.prop_type ? `${example.prop_type}` : 'leg'} · {titleCase(example.tag)}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-slate-500">
            Confidence: {titleCase(patternSummary?.confidence_level ?? 'low')}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onShare}
          className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/5"
        >
          {shareStatus === 'done'
            ? 'Shared run'
            : shareStatus === 'error'
              ? 'Share unavailable'
              : 'Share'}
        </button>
      </div>
      {postmortem ? (
        <div>
          <p className="font-medium mt-2">What to change next time</p>
          <ul className="mt-1 list-disc pl-5 text-slate-300">
            {buildNextTimeAdjustments(postmortem).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
