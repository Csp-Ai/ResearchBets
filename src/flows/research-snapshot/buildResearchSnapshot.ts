import { createHash } from 'node:crypto';

import { createDeterministicRunId, createTraceId } from '../../core/agent-runtime/ids';
import type { AgentContext } from '../../core/agent-runtime/types';
import { computeConfidence } from '../../core/evidence/confidence';
import type { Claim, EvidenceItem, ResearchReport } from '../../core/evidence/evidenceSchema';
import { ResearchReportSchema } from '../../core/evidence/validators';
import { MockInjuryProvider } from '../../core/sources/mock/MockInjuryProvider';
import { MockOddsProvider } from '../../core/sources/mock/MockOddsProvider';
import { MockStatsProvider } from '../../core/sources/mock/MockStatsProvider';
import type { SourceProvider } from '../../core/sources/types';

export interface ResearchSnapshotInput {
  sport: string;
  league: string;
  matchupId?: string;
  homeTeam: string;
  awayTeam: string;
  gameTime?: string;
  marketType?: string;
  seed?: string;
}

interface BuildResearchSnapshotOptions {
  providers?: SourceProvider[];
  now?: string;
}

const defaultProviders: SourceProvider[] = [new MockOddsProvider(), new MockInjuryProvider(), new MockStatsProvider()];

const hoursBetween = (laterIso: string, earlierIso?: string): number => {
  if (!earlierIso) {
    return 72;
  }

  const deltaMs = new Date(laterIso).getTime() - new Date(earlierIso).getTime();
  return Math.max(0, deltaMs / (1000 * 60 * 60));
};

const dedupeEvidence = (items: EvidenceItem[]): EvidenceItem[] => {
  const seen = new Map<string, EvidenceItem>();

  for (const item of items) {
    const excerptHash = createHash('sha1').update(item.contentExcerpt).digest('hex').slice(0, 12);
    const key = `${item.sourceType}:${excerptHash}`;

    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return [...seen.values()];
};

const makeClaimId = (subject: string, claimType: string): string => {
  const id = createHash('sha1').update(`${subject}:${claimType}`).digest('hex').slice(0, 12);
  return `claim_${id}`;
};

const toClaimConfidence = (evidence: EvidenceItem[], now: string, agreementScore: number): number => {
  const sourceReliability =
    evidence.length === 0 ? 0 : evidence.reduce((sum, item) => sum + (item.reliability ?? 0.5), 0) / evidence.length;
  const recencyHours =
    evidence.length === 0
      ? 72
      : Math.min(...evidence.map((item) => hoursBetween(now, item.observedAt ?? item.retrievedAt)));

  return computeConfidence({
    evidenceCount: evidence.length,
    sourceReliability,
    recencyHours,
    agreementScore,
    modelSelfConsistency: evidence.length >= 1 ? 0.8 : 0.3,
  });
};

const parseToward = (item: EvidenceItem): 'home' | 'away' | 'unknown' => {
  const rawToward = typeof item.raw?.toward === 'string' ? item.raw.toward : '';
  if (rawToward === 'home' || rawToward === 'away') {
    return rawToward;
  }

  return 'unknown';
};

const buildClaims = ({
  evidence,
  now,
  input,
}: {
  evidence: EvidenceItem[];
  now: string;
  input: ResearchSnapshotInput;
}): Claim[] => {
  const claims: Claim[] = [];

  const oddsEvidence = evidence.filter((item) => item.sourceType === 'odds');
  if (oddsEvidence.length > 0) {
    const firstOdds = oddsEvidence.at(0);
    if (firstOdds) {
      const movement = Number(firstOdds.raw?.movement ?? 0);
      const toward = parseToward(firstOdds);
      const targetTeam = toward === 'home' ? input.homeTeam : input.awayTeam;

      claims.push({
        id: makeClaimId(`${input.homeTeam}-${input.awayTeam}`, 'line-movement'),
        text: `Line moved ${Math.abs(movement)} points toward ${targetTeam} since the prior observation window.`,
        confidence: toClaimConfidence(oddsEvidence, now, 0.75),
        rationale: `Odds evidence indicates directional market pressure toward ${targetTeam}.`,
        evidenceIds: oddsEvidence.map((item) => item.id),
        relatedEntities: [input.homeTeam, input.awayTeam],
      });
    }
  }

  const injuryEvidence = evidence.filter((item) => item.sourceType === 'injury');
  if (injuryEvidence.length > 0) {
    const injury = injuryEvidence.at(0);
    if (injury) {
      const side = String(injury.raw?.side ?? 'home');
      const impactedTeam = side === 'home' ? input.homeTeam : input.awayTeam;
      const position = String(injury.raw?.position ?? 'rotation');

      claims.push({
        id: makeClaimId(`${input.homeTeam}-${input.awayTeam}`, 'injury-impact'),
        text: `Key ${position} availability concerns may materially impact ${impactedTeam}'s position group depth.`,
        confidence: toClaimConfidence(injuryEvidence, now, 0.65),
        rationale: `Injury report flags concentrated risk in ${impactedTeam}'s ${position} group.`,
        evidenceIds: injuryEvidence.map((item) => item.id),
        relatedEntities: [impactedTeam, position],
      });
    }
  }

  const statsEvidence = evidence.filter((item) => item.sourceType === 'stats');
  if (statsEvidence.length > 0) {
    const stats = statsEvidence.at(0);
    if (stats) {
      const homePace = Number(stats.raw?.homePace ?? 0);
      const awayPace = Number(stats.raw?.awayPace ?? 0);
      const homeEff = Number(stats.raw?.homeEff ?? 0);
      const awayEff = Number(stats.raw?.awayEff ?? 0);
      const homeEdge = (homePace - awayPace) + (homeEff - awayEff);
      const favoredTeam = homeEdge >= 0 ? input.homeTeam : input.awayTeam;

      claims.push({
        id: makeClaimId(`${input.homeTeam}-${input.awayTeam}`, 'pace-efficiency-mismatch'),
        text: `Pace and efficiency mismatch currently favors ${favoredTeam}.`,
        confidence: toClaimConfidence(statsEvidence, now, 0.7),
        rationale: `Combined pace/efficiency delta computed at ${Math.abs(Number(homeEdge.toFixed(1)))} points toward ${favoredTeam}.`,
        evidenceIds: statsEvidence.map((item) => item.id),
        relatedEntities: [input.homeTeam, input.awayTeam],
      });
    }
  }

  return claims;
};

export const buildResearchSnapshot = async (
  input: ResearchSnapshotInput,
  context: Pick<AgentContext, 'requestId'> & Partial<Pick<AgentContext, 'runId' | 'traceId'>>,
  options?: BuildResearchSnapshotOptions,
): Promise<ResearchReport> => {
  const now = options?.now ?? new Date().toISOString();
  const subject = `${input.sport}:${input.league}:${input.awayTeam}@${input.homeTeam}`;
  const providers = options?.providers ?? defaultProviders;

  const providerResults = await Promise.all(
    providers.map(async (provider) => provider.fetch(subject, { seed: input.seed, now })),
  );

  const normalizedEvidence = dedupeEvidence(
    providerResults
      .flat()
      .map((item) => ({ ...item, tags: item.tags ?? [], reliability: item.reliability ?? 0.5 }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );

  const claims = buildClaims({ evidence: normalizedEvidence, now, input });

  const runId = context.runId ?? createDeterministicRunId(['researchSnapshot', context.requestId, JSON.stringify(input)]);
  const traceId = context.traceId ?? createTraceId();

  const report: ResearchReport = {
    reportId: createDeterministicRunId(['report', runId, traceId, subject]),
    runId,
    traceId,
    createdAt: now,
    subject,
    claims,
    evidence: normalizedEvidence,
    summary: `Research Snapshot for ${input.awayTeam} at ${input.homeTeam} built from ${normalizedEvidence.length} evidence receipts and ${claims.length} claims.`,
    risks: [
      'Mock source adapters may not reflect late-breaking market/news updates.',
      'Confidence is deterministic and heuristic-based; not calibrated to realized outcomes yet.',
    ],
    assumptions: [
      `Market type assumed as ${input.marketType ?? 'spread'} when deriving odds interpretation.`,
      'Provider timestamps represent retrieval windows, not official publication timestamps.',
    ],
  };

  return ResearchReportSchema.parse(report);
};
