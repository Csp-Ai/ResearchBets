import { createHash, randomUUID } from 'node:crypto';

import { ConnectorRegistry } from '../../core/connectors/connectorRegistry';
import { InjuriesConnector, NewsConnector, OddsConnector, StatsConnector } from '../../core/connectors/mockConnectors';
import type { ResearchTier, RuntimeEnvironment } from '../../core/connectors/Connector';
import type { EventEmitter } from '../../core/control-plane/emitter';
import type { ControlPlaneEventName } from '../../core/control-plane/events';
import type { Claim, EvidenceItem, ResearchReport } from '../../core/evidence/evidenceSchema';
import { ResearchReportSchema } from '../../core/evidence/validators';
import { isAllowedCitationUrl, isSuspiciousEvidence, redactPii } from '../../core/guardrails/safety';
import type { RuntimeStore } from '../../core/persistence/runtimeStore';
import { getRuntimeStore } from '../../core/persistence/runtimeStoreProvider';
import { logAgentRecommendation, logFinalRecommendation } from '../../core/measurement/recommendations';

export interface BuildResearchSnapshotInput {
  subject: string;
  sessionId: string;
  userId: string;
  tier: ResearchTier;
  environment: RuntimeEnvironment;
  seed: string;
  traceId: string;
  runId: string;
  requestId: string;
}

const confidence = (seed: string, evidenceCount: number, idx: number): number => {
  const n = Number.parseInt(createHash('sha1').update(`${seed}:${idx}`).digest('hex').slice(0, 6), 16);
  return Number((((n % 100) / 100) * 0.35 + Math.min(evidenceCount / 10, 0.45) + 0.2).toFixed(4));
};

const dedupeEvidence = (evidence: EvidenceItem[]): EvidenceItem[] => {
  const map = new Map<string, EvidenceItem>();
  for (const item of evidence) {
    map.set(item.contentHash, item);
  }
  return [...map.values()];
};

const emit = async (
  emitter: EventEmitter,
  eventName: ControlPlaneEventName,
  input: BuildResearchSnapshotInput,
  properties: Record<string, unknown> = {},
): Promise<void> => {
  await emitter.emit({
    event_name: eventName,
    timestamp: new Date().toISOString(),
    request_id: input.requestId,
    trace_id: input.traceId,
    run_id: input.runId,
    session_id: input.sessionId,
    user_id: input.userId,
    agent_id: 'research_snapshot',
    model_version: 'runtime-deterministic-v1',
    properties,
  });
};

export const buildResearchSnapshot = async (
  input: BuildResearchSnapshotInput,
  emitter: EventEmitter,
  env: Record<string, string | undefined> = process.env,
  store: RuntimeStore = getRuntimeStore(),
): Promise<ResearchReport> => {
  const startedAt = Date.now();
  const registry = new ConnectorRegistry(env);
  [OddsConnector, InjuriesConnector, StatsConnector, NewsConnector].forEach((connector) => registry.register(connector));
  await emit(emitter, 'agent_invocation_started', input, {
    input_type: 'research_subject',
    input_size: input.subject.length,
    trigger: 'api_request',
    environment: input.environment,
  });

  const { selected, skipped } = registry.resolve(input.tier, input.environment);
  await emit(emitter, 'connector_selected', input, {
    selected: selected.map((c) => c.id),
    skipped,
  });

  const now = new Date().toISOString();
  const allEvidence: EvidenceItem[] = [];

  await Promise.all(
    selected.map(async (connector) => {
      await emit(emitter, 'connector_fetch_started', input, { connector_id: connector.id });
      const result = await connector.fetch(input.subject, { seed: input.seed, now });
      allEvidence.push(...result.evidence.map((ev) => ({ ...ev, raw: result.raw })));
      await emit(emitter, 'connector_fetch_finished', input, {
        connector_id: connector.id,
        evidence_count: result.evidence.length,
      });
    }),
  );

  const sanitized = dedupeEvidence(
    allEvidence
      .map((item) => {
        const suspicious = isSuspiciousEvidence(item.contentExcerpt);
        return {
          ...item,
          contentExcerpt: redactPii(item.contentExcerpt),
          suspicious,
        };
      })
      .filter((item) => isAllowedCitationUrl(item.sourceUrl)),
  );

  const safeEvidence = sanitized.filter((item) => !item.suspicious);
  if (sanitized.length !== safeEvidence.length) {
    await emit(emitter, 'guardrail_tripped', input, { reason: 'prompt_injection_heuristic' });
  }

  await emit(emitter, 'evidence_normalized', input, { evidence_count: safeEvidence.length });

  const claims: Claim[] = safeEvidence.slice(0, 3).map((item, idx) => ({
    id: `claim_${idx + 1}`,
    text: `Evidence-backed signal from ${item.sourceName}: ${item.contentExcerpt}`,
    rationale: 'Rules engine generated claim from normalized deterministic evidence.',
    evidenceIds: [item.id],
    confidence: confidence(input.seed, safeEvidence.length, idx),
  }));

  const avg = claims.length === 0 ? 0 : claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;

  const report: ResearchReport = {
    reportId: `snapshot_${randomUUID()}`,
    runId: input.runId,
    traceId: input.traceId,
    createdAt: now,
    subject: input.subject,
    claims,
    evidence: safeEvidence,
    summary: `Snapshot generated with ${safeEvidence.length} evidence items and ${claims.length} claims.`,
    confidenceSummary: { averageClaimConfidence: Number(avg.toFixed(4)), deterministic: true },
    risks: ['Evidence is connector-scoped and tier-gated.'],
    assumptions: ['Confidence is deterministic heuristic, not calibrated.'],
  };

  const validated = ResearchReportSchema.parse(report);
  await emit(emitter, 'report_validated', input, { claim_count: validated.claims.length });

  if (claims[0]) {
    const recommendationPayload = {
      sessionId: input.sessionId,
      userId: input.userId,
      requestId: input.requestId,
      traceId: input.traceId,
      runId: input.runId,
      agentId: 'research_snapshot',
      agentVersion: 'runtime-deterministic-v1',
      gameId: input.subject,
      marketType: 'moneyline' as const,
      market: 'snapshot_claim',
      selection: claims[0].text,
      line: null,
      price: null,
      confidence: claims[0].confidence,
      rationale: { text: claims[0].rationale },
      evidenceRefs: { evidence_ids: claims[0].evidenceIds },
    };
    const parentId = await logAgentRecommendation(recommendationPayload, emitter, store);
    await logFinalRecommendation({ ...recommendationPayload, parentRecommendationId: parentId, groupId: input.runId }, emitter, store);
  }

  await store.saveSnapshot(validated);
  await emit(emitter, 'snapshot_saved', input, { snapshot_id: validated.reportId });

  await emit(emitter, 'agent_invocation_completed', input, {
    status: 'success',
    output_type: 'research_report',
    duration_ms: Date.now() - startedAt,
    tokens_in: null,
    tokens_out: null,
  });

  return validated;
};
