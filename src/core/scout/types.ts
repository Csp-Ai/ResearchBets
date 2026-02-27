import type { TodayPayloadSchema } from '@/src/core/contracts/envelopes';

export type TodayPayloadLike = typeof TodayPayloadSchema._type;
export type TodayBoardRow = TodayPayloadLike['board'][number];

export type ScoutRiskTag = 'stable' | 'watch' | 'fragile' | 'correlation';

export type ScoutCard = {
  id: string;
  title: string;
  hooks: string[];
  evidence: string[];
  riskTags: ScoutRiskTag[];
  ctaLabel: string;
  ctaPath: '/today' | '/stress-test' | '/postmortem';
  ctaQuery?: Record<string, string | number | undefined>;
};
