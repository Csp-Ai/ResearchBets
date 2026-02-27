import { appendQuery } from '@/src/components/landing/navigation';
import { toHref } from '@/src/core/nervous/routes';
import { DEFAULT_SPINE } from '@/src/core/nervous/spine';
import { TodayPayloadSchema } from '@/src/core/contracts/envelopes';

type TodayPayload = typeof TodayPayloadSchema._type;

export type LandingHook = {
  id: string;
  kind: 'line_move' | 'volatility_watch' | 'high_hit_rate' | 'correlation_risk' | 'injury_watch' | 'underdog_value';
  title: string;
  blurb: string;
  gameId?: string;
  propId?: string;
  ctaLabel: 'Learn why' | 'Open game';
  ctaHref: string;
};

const openGameHref = (gameId: string, liveMode: boolean) => {
  const path = liveMode ? `/live/${encodeURIComponent(gameId)}` : `/game/${encodeURIComponent(gameId)}`;
  return appendQuery(toHref(path, DEFAULT_SPINE), { source: 'landing_hook' });
};

export function deriveLandingHooks(payload: TodayPayload, draftLegIds: string[] = []): LandingHook[] {
  const hooks: LandingHook[] = [];
  const board = payload.board.slice(0, 12);
  const hasManyWatch = board.filter((prop) => prop.riskTag === 'watch').length >= 2;
  const topHitRate = [...board].sort((a, b) => Number(b.hitRateL10 ?? 0) - Number(a.hitRateL10 ?? 0))[0];
  const underdog = board.find((prop) => prop.odds.startsWith('+'));
  const watchProp = board.find((prop) => prop.riskTag === 'watch');

  if (watchProp) {
    hooks.push({
      id: `volatility-${watchProp.id}`,
      kind: 'volatility_watch',
      title: 'Volatility watch',
      blurb: `${watchProp.player} ${watchProp.market} ${watchProp.line} is tagged watch risk tonight.`,
      gameId: watchProp.gameId,
      propId: watchProp.id,
      ctaLabel: 'Learn why',
      ctaHref: openGameHref(watchProp.gameId, payload.mode === 'live')
    });
  }

  if (topHitRate) {
    hooks.push({
      id: `hit-rate-${topHitRate.id}`,
      kind: 'high_hit_rate',
      title: 'High hit-rate',
      blurb: `${topHitRate.player} has L10 ${topHitRate.hitRateL10 ?? 0}% on this market.`,
      gameId: topHitRate.gameId,
      propId: topHitRate.id,
      ctaLabel: 'Learn why',
      ctaHref: openGameHref(topHitRate.gameId, payload.mode === 'live')
    });
  }

  if (underdog) {
    hooks.push({
      id: `underdog-${underdog.id}`,
      kind: 'underdog_value',
      title: 'Underdog value',
      blurb: `${underdog.player} sits at ${underdog.odds} with stable line context to review.`,
      gameId: underdog.gameId,
      propId: underdog.id,
      ctaLabel: 'Open game',
      ctaHref: openGameHref(underdog.gameId, payload.mode === 'live')
    });
  }

  if (hasManyWatch) {
    hooks.push({
      id: 'injury-watch-cluster',
      kind: 'injury_watch',
      title: 'Injury watch',
      blurb: 'Multiple props are sitting in watch mode. Confirm late status before lock.',
      ctaLabel: 'Learn why',
      ctaHref: appendQuery(toHref('/today', DEFAULT_SPINE), { filter: 'watch' })
    });
  }

  if (draftLegIds.length >= 2) {
    hooks.push({
      id: 'correlation-risk',
      kind: 'correlation_risk',
      title: 'Correlation risk',
      blurb: `You already stacked ${draftLegIds.length} legs. Verify weakest-leg downside now.`,
      ctaLabel: 'Learn why',
      ctaHref: appendQuery(toHref('/stress-test', DEFAULT_SPINE), { source: 'landing_hook' })
    });
  }

  return hooks.slice(0, 6);
}
