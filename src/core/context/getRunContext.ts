import { fetchCoverageAgentContext } from './coverageAgentProvider';
import { fetchTrustedContext } from './trustedContextProvider';
import type { TrustedContextBundle, TrustedContextItem } from './types';

type RunContextInput = Parameters<typeof fetchTrustedContext>[0] & { legsText: string };

const normalize = (value?: string): string => (value ?? '').trim().toLowerCase();
const canonical = (item: TrustedContextItem): string => `${normalize(item.kind)}|${normalize(item.subject.player ?? item.subject.playerId ?? item.subject.team ?? item.subject.teamId ?? item.headline)}`;
const asUnverified = (item: TrustedContextItem): TrustedContextItem => ({ ...item, trust: item.trust === 'verified' ? 'verified' : 'unverified' });

export async function getRunContext(input: RunContextInput): Promise<TrustedContextBundle> {
  const trustedBundle = await fetchTrustedContext(input);
  const enabled = process.env.ENABLE_COVERAGE_AGENT === 'true';
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
