import { createHash } from 'crypto';

import { getTrustedContextCache, setTrustedContextCache } from './cache';
import type { TrustedContextBundle, TrustedContextItem, TrustedSourceRef } from './types';

type CoverageInput = {
  sport: 'nba' | 'nfl' | 'soccer';
  teams: Array<{ teamId?: string; team?: string }>;
  players: Array<{ playerId?: string; player?: string; teamId?: string; team?: string }>;
  legsText: string;
  trustedBundle: TrustedContextBundle;
};

type CoverageOutput = { asOf: string; items: TrustedContextItem[]; sources: TrustedSourceRef[] };

const COVERAGE_CACHE_NS = 'coveragectx:v1';
const COVERAGE_TTL_MS = 15 * 60 * 1000;

const VERIFIED_DOMAIN_PATTERNS = [
  /(^|\.)nba\.com$/,
  /(^|\.)wnba\.com$/,
  /(^|\.)nfl\.com$/,
  /(^|\.)mlssoccer\.com$/,
  /(^|\.)premierleague\.com$/,
  /(^|\.)uefa\.com$/,
  /(^|\.)fifa\.com$/,
  /(^|\.)sportsdata\.io$/,
  /(^|\.)the-odds-api\.com$/
];

const normalize = (value?: string): string => (value ?? '').trim().toLowerCase();

const hostFromUrl = (value?: string): string | null => {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const isVerifiedDomain = (url?: string): boolean => {
  const host = hostFromUrl(url);
  if (!host) return false;
  return VERIFIED_DOMAIN_PATTERNS.some((pattern) => pattern.test(host));
};

const trustForSource = (url?: string): TrustedSourceRef['trust'] => isVerifiedDomain(url) ? 'verified' : 'unverified';

const keyForInput = (input: CoverageInput): string => {
  const teamKey = input.teams.map((team) => normalize(team.teamId) || normalize(team.team)).filter(Boolean).sort().join(',');
  const playerKey = input.players.map((player) => normalize(player.playerId) || normalize(player.player)).filter(Boolean).sort().slice(0, 10).join(',');
  const legsChecksum = createHash('sha1').update(input.legsText).digest('hex').slice(0, 16);
  return `${input.sport}|${teamKey}|${playerKey}|${legsChecksum}`;
};

const canonicalItemKey = (item: TrustedContextItem): string => `${normalize(item.kind)}|${normalize(item.subject.player ?? item.subject.playerId ?? item.subject.team ?? item.subject.teamId ?? item.headline)}`;

type AgentResponse = {
  items?: Array<{ kind?: TrustedContextItem['kind']; headline?: string; detail?: string; asOf?: string; subject?: TrustedContextItem['subject']; sourceUrls?: string[]; computed?: boolean }>;
  sources?: Array<{ label?: string; url?: string; retrievedAt?: string }>;
};

export const __internal = {
  isVerifiedDomain,
  trustForSource,
  keyForInput,
  canonicalItemKey
};

const defaultCoverageAgent = async (): Promise<AgentResponse> => {
  const raw = process.env.COVERAGE_AGENT_MOCK_JSON;
  if (!raw) return { items: [], sources: [] };
  try {
    return JSON.parse(raw) as AgentResponse;
  } catch {
    return { items: [], sources: [] };
  }
};

export const createCoverageAgentProvider = (runAgent: (input: CoverageInput) => Promise<AgentResponse> = defaultCoverageAgent) => ({
  async fetchCoverageAgentContext(input: CoverageInput): Promise<CoverageOutput> {
    const asOf = new Date().toISOString();
    const key = `${COVERAGE_CACHE_NS}:${keyForInput(input)}`;
    const cached = getTrustedContextCache<CoverageOutput>(key);
    if (cached) return cached;

    const trustedKeys = new Set(input.trustedBundle.items.map(canonicalItemKey));
    const raw = await runAgent(input);

    const normalizedSources: TrustedSourceRef[] = (raw.sources ?? []).map((source) => ({
      provider: 'coverage_agent',
      label: source.label ?? hostFromUrl(source.url) ?? 'Coverage agent source',
      url: source.url,
      retrievedAt: source.retrievedAt ?? asOf,
      trust: trustForSource(source.url)
    }));

    const sourceMap = new Map(normalizedSources.map((source) => [source.url ?? source.label, source]));

    const normalizedItems: TrustedContextItem[] = [];
    for (const candidate of raw.items ?? []) {
      if (!candidate.kind || !candidate.headline) continue;
      const linkedSources = (candidate.sourceUrls ?? [])
        .map((url) => sourceMap.get(url) ?? {
          provider: 'coverage_agent' as const,
          label: hostFromUrl(url) ?? 'Coverage agent source',
          url,
          retrievedAt: asOf,
          trust: trustForSource(url)
        })
        .filter(Boolean);

      const isInjuryLike = candidate.kind === 'injury' || candidate.kind === 'suspension' || candidate.kind === 'status';
      if (isInjuryLike && linkedSources.length === 0) continue;
      if (linkedSources.length === 0 && !candidate.computed) continue;

      const trust: TrustedContextItem['trust'] = linkedSources.every((source) => source.trust === 'verified') ? 'verified' : 'unverified';
      const item: TrustedContextItem = {
        kind: candidate.kind,
        subject: candidate.subject ?? { sport: input.sport },
        headline: candidate.headline,
        detail: candidate.detail,
        confidence: trust === 'verified' ? 'verified' : 'unknown',
        trust,
        asOf: candidate.asOf ?? asOf,
        sources: linkedSources
      };

      if (trustedKeys.has(canonicalItemKey(item))) continue;
      normalizedItems.push(item);
    }

    const output = { asOf, items: normalizedItems, sources: normalizedSources };
    return setTrustedContextCache(key, output, COVERAGE_TTL_MS);
  }
});

const provider = createCoverageAgentProvider();

export async function fetchCoverageAgentContext(input: CoverageInput): Promise<CoverageOutput> {
  return provider.fetchCoverageAgentContext(input);
}
