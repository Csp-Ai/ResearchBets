import type { TodayMode } from '@/src/core/today/types';

export type LoopSourceType = 'board_staged' | 'parser_derived' | 'manual_entry' | 'tracked_ticket';

export type LoopReviewState = 'verified' | 'reviewed' | 'unreviewed';

export type LoopProvenance = {
  mode: TodayMode;
  source_type: LoopSourceType;
  review_state?: LoopReviewState;
};

export type LoopTrustBadge = {
  label: string;
  tone: 'live' | 'cache' | 'demo' | 'neutral';
};

export function buildLoopProvenance(input: {
  mode?: TodayMode;
  sourceType: LoopSourceType;
  reviewState?: LoopReviewState;
}): LoopProvenance {
  return {
    mode: input.mode ?? 'demo',
    source_type: input.sourceType,
    review_state: input.reviewState
  };
}

export function getLoopTrustBadges(provenance?: LoopProvenance): LoopTrustBadge[] {
  if (!provenance) return [];

  const modeBadge: LoopTrustBadge =
    provenance.mode === 'live'
      ? { label: 'Live-backed', tone: 'live' }
      : provenance.mode === 'cache'
        ? { label: 'Cache-backed', tone: 'cache' }
        : { label: 'Demo mode (live feeds off)', tone: 'demo' };

  const sourceBadge: LoopTrustBadge =
    provenance.source_type === 'parser_derived'
      ? { label: 'Parser-derived entry', tone: 'neutral' }
      : provenance.source_type === 'board_staged'
        ? { label: 'Board-built ticket', tone: 'neutral' }
        : provenance.source_type === 'manual_entry'
          ? { label: 'Manual tracked entry', tone: 'neutral' }
          : { label: 'Tracked ticket', tone: 'neutral' };

  const reviewBadge =
    provenance.review_state === 'verified'
      ? ({ label: 'Verified record', tone: 'live' } satisfies LoopTrustBadge)
      : provenance.review_state === 'reviewed'
        ? ({ label: 'Reviewed record', tone: 'neutral' } satisfies LoopTrustBadge)
        : provenance.review_state === 'unreviewed'
          ? ({ label: 'Needs review', tone: 'cache' } satisfies LoopTrustBadge)
          : null;

  return [modeBadge, sourceBadge, ...(reviewBadge ? [reviewBadge] : [])];
}
