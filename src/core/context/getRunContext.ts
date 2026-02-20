import { fetchCoverageAgentContext } from './coverageAgentProvider';
import { createTrustedContextProvider } from './trustedContextProvider';
import type { TrustedContextBundle, TrustedContextItem } from './types';

type RunContextInput = {
  sport: 'nba' | 'nfl' | 'soccer';
  teams: Array<{ teamId?: string; team?: string }>;
  players: Array<{ playerId?: string; player?: string; teamId?: string; team?: string }>;
  eventIds?: string[];
  legsText: string;
  coverageAgentEnabled?: boolean;
};

const normalize = (value?: string): string => (value ?? '').trim().toLowerCase();
const canonical = (item: TrustedContextItem): string => `${normalize(item.kind)}|${normalize(item.subject.player ?? item.subject.playerId ?? item.subject.team ?? item.subject.teamId ?? item.headline)}`;
const asUnverified = (item: TrustedContextItem): TrustedContextItem => ({ ...item, trust: item.trust === 'verified' ? 'verified' : 'unverified' });

const trustedProvider = createTrustedContextProvider();

export async function getRunContext(input: RunContextInput): Promise<TrustedContextBundle> {
  const trustedBundle = await trustedProvider.fetchTrustedContext(input);
  const enabled = input.coverageAgentEnabled ?? process.env.ENABLE_COVERAGE_AGENT === 'true';
  if (!enabled) return trustedBundle;

  const coverage = await fetchCoverageAgentContext({
    sport: input.sport,
    teams: input.teams,
    players: input.players,
    legsText: input.legsText,
    trustedBundle
  });

  const trustedKeys = new Set(trustedBundle.items.map(canonical));
  const unverifiedItems = coverage.items
    .map(asUnverified)
    .filter((item) => item.trust === 'unverified')
    .filter((item) => !trustedKeys.has(canonical(item)));

  return {
    ...trustedBundle,
    unverifiedItems
  };
}
