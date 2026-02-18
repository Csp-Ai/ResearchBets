import { createHash } from 'node:crypto';

import { createDeterministicRunId, createTraceId } from '../../core/agent-runtime/ids';
import type { AgentContext } from '../../core/agent-runtime/types';
import type { RuntimeEventName } from '../../core/agent-runtime/trace';
import { computeConfidence } from '../../core/evidence/confidence';
import type { Claim, EvidenceItem, ResearchReport } from '../../core/evidence/evidenceSchema';
import { ResearchReportSchema } from '../../core/evidence/validators';
import type { Connector, ConnectorExecutionContext, ResearchTier } from '../../core/connectors/Connector';
import { ConnectorRegistry } from '../../core/connectors/connectorRegistry';
import { OddsConnector } from '../../core/connectors/OddsConnector';

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
  connectors?: Connector[];
  registry?: ConnectorRegistry;
  now?: string;
  tier?: ResearchTier;
}

interface ResearchEventContext {
  traceId: string;
  runId: string;
  requestId: string;
  userId?: string | null;
  environment: 'dev' | 'staging' | 'prod';
  traceEmitter?: AgentContext['traceEmitter'];
}

const emitResearchEvent = async ({
  context,
  eventName,
  payload,
}: {
  context: ResearchEventContext;
  eventName: RuntimeEventName;
  payload?: Record<string, unknown>;
}): Promise<void> => {
  if (!context.traceEmitter) {
    return;
  }

  await context.traceEmitter.emit({
    eventName,
    observabilityEventName: 'agent_invocation_started',
    timestamp: new Date().toISOString(),
    traceId: context.traceId,
    runId: context.runId,
    requestId: context.requestId,
    userId: context.userId ?? null,
    agentId: 'researchSnapshot',
    modelVersion: '0.1.0',
    confidence: null,
    assumptions: null,
    tokensIn: null,
    tokensOut: null,
    costUsd: null,
    environment: context.environment,
    payload: payload ?? {},
  });
};

const defaultConnectors: Connector[] = [new OddsConnector()];

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
    const key = `${item.sourceType}:${item.contentHash}`;

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

  return claims;
};

export const buildResearchSnapshot = async (
  input: ResearchSnapshotInput,
  context: Pick<AgentContext, 'requestId'> &
    Partial<Pick<AgentContext, 'runId' | 'traceId' | 'traceEmitter' | 'userId' | 'environment'>>,
  options?: BuildResearchSnapshotOptions,
): Promise<ResearchReport> => {
  const now = options?.now ?? new Date().toISOString();
  const subject = `${input.sport}:${input.league}:${input.awayTeam}@${input.homeTeam}`;
  const runId = context.runId ?? createDeterministicRunId(['researchSnapshot', context.requestId, JSON.stringify(input)]);
  const traceId = context.traceId ?? createTraceId();
  const tier = options?.tier ?? 'free';
  const environment = context.environment ?? 'dev';

  const eventContext = {
    traceId,
    runId,
    requestId: context.requestId,
    userId: context.userId,
    environment,
    traceEmitter: context.traceEmitter,
  };

  const registry = options?.registry ?? new ConnectorRegistry();
  const connectors = options?.connectors ?? defaultConnectors;
  connectors.forEach((connector) => registry.register(connector));

  const policy = registry.resolve(tier, { environment });

  await emitResearchEvent({
    context: eventContext,
    eventName: 'CONNECTOR_SELECTED',
    payload: {
      selectedConnectorIds: policy.selected.map((connector) => connector.id),
      skipped: policy.skipped,
      tier,
    },
  });

  const connectorContext: ConnectorExecutionContext = {
    subject,
    traceId,
    runId,
    requestId: context.requestId,
    userId: context.userId,
    agentId: 'researchSnapshot',
    modelVersion: '0.1.0',
    environment,
    traceEmitter: context.traceEmitter,
  };

  const fetchedEvidence: EvidenceItem[] = [];

  for (const connector of policy.selected) {
    await emitResearchEvent({
      context: eventContext,
      eventName: 'CONNECTOR_FETCH_STARTED',
      payload: { connectorId: connector.id, sourceType: connector.sourceType },
    });

    const result = await connector.fetch(connectorContext, {
      seed: input.seed,
      now,
      idempotencyKey: `${runId}:${connector.id}:${subject}`,
    });

    fetchedEvidence.push(...result.evidence);

    await emitResearchEvent({
      context: eventContext,
      eventName: 'CONNECTOR_FETCH_FINISHED',
      payload: { connectorId: connector.id, evidenceCount: result.evidence.length },
    });
  }

  const normalizedEvidence = dedupeEvidence(
    fetchedEvidence
      .map((item) => ({
        ...item,
        tags: item.tags ?? [],
        reliability: item.reliability ?? 0.5,
        contentHash: item.contentHash || createHash('sha256').update(item.contentExcerpt).digest('hex'),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );

  await emitResearchEvent({
    context: eventContext,
    eventName: 'EVIDENCE_NORMALIZED',
    payload: { evidenceCount: normalizedEvidence.length },
  });

  const claims = buildClaims({ evidence: normalizedEvidence, now, input });
  const averageClaimConfidence =
    claims.length === 0 ? 0 : Number((claims.reduce((sum, claim) => sum + claim.confidence, 0) / claims.length).toFixed(4));

  const report: ResearchReport = {
    reportId: createDeterministicRunId(['report', runId, traceId, subject]),
    runId,
    traceId,
    createdAt: now,
    subject,
    claims,
    evidence: normalizedEvidence,
    summary: `Research Snapshot for ${input.awayTeam} at ${input.homeTeam} built from ${normalizedEvidence.length} evidence receipts and ${claims.length} claims.`,
    confidenceSummary: {
      averageClaimConfidence,
      deterministic: true,
    },
    risks: [
      'Connector policy may intentionally exclude some data sources for tier or environment safety constraints.',
      'Confidence is deterministic and heuristic-based; not calibrated to realized outcomes yet.',
    ],
    assumptions: [
      `Market type assumed as ${input.marketType ?? 'spread'} when deriving odds interpretation.`,
      'Provider timestamps represent retrieval windows, not official publication timestamps.',
    ],
  };

  const validated = ResearchReportSchema.parse(report);

  await emitResearchEvent({
    context: eventContext,
    eventName: 'REPORT_VALIDATED',
    payload: { claimCount: validated.claims.length },
  });

  await emitResearchEvent({
    context: eventContext,
    eventName: 'REPORT_SAVED',
    payload: { reportId: validated.reportId },
  });

  return validated;
};
