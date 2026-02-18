import { createHash, randomUUID } from 'node:crypto';

import { ConnectorRegistry } from '../../core/connectors/connectorRegistry';
import { InjuriesConnector, NewsConnector, OddsConnector, StatsConnector } from '../../core/connectors/mockConnectors';
import type { ResearchTier, RuntimeEnvironment } from '../../core/connectors/Connector';
import type { EventEmitter } from '../../core/control-plane/emitter';
import type { ControlPlaneEventName } from '../../core/control-plane/events';
import type { Claim, EvidenceItem, ResearchReport } from '../../core/evidence/evidenceSchema';
import { ResearchReportSchema } from '../../core/evidence/validators';
import { isAllowedCitationUrl, isSuspiciousEvidence, redactPii } from '../../core/guardrails/safety';

export interface BuildResearchSnapshotInput {
  subject: string;
  sessionId: string;
  userId: string;
  tier: ResearchTier;
  environment: RuntimeEnvironment;
  seed: string;
  traceId: string;
  runId: string;
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
    eventName,
    timestamp: new Date().toISOString(),
    traceId: input.traceId,
    runId: input.runId,
    sessionId: input.sessionId,
    userId: input.userId,
    properties,
  });
};

export const buildResearchSnapshot = async (
  input: BuildResearchSnapshotInput,
  emitter: EventEmitter,
  env: Record<string, string | undefined> = process.env,
): Promise<ResearchReport> => {
  const registry = new ConnectorRegistry(env);
  [OddsConnector, InjuriesConnector, StatsConnector, NewsConnector].forEach((connector) => registry.register(connector));
  await emit(emitter, 'RUN_STARTED', input);

  const { selected, skipped } = registry.resolve(input.tier, input.environment);
  await emit(emitter, 'CONNECTOR_SELECTED', input, {
    selected: selected.map((c) => c.id),
    skipped,
  });

  const now = new Date().toISOString();
  const allEvidence: EvidenceItem[] = [];

  await Promise.all(
    selected.map(async (connector) => {
      await emit(emitter, 'CONNECTOR_FETCH_STARTED', input, { connectorId: connector.id });
      const result = await connector.fetch(input.subject, { seed: input.seed, now });
      allEvidence.push(...result.evidence.map((ev) => ({ ...ev, raw: result.raw })));
      await emit(emitter, 'CONNECTOR_FETCH_FINISHED', input, {
        connectorId: connector.id,
        evidenceCount: result.evidence.length,
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
    await emit(emitter, 'GUARDRAIL_TRIPPED', input, { reason: 'prompt_injection_heuristic' });
  }

  await emit(emitter, 'EVIDENCE_NORMALIZED', input, { evidenceCount: safeEvidence.length });

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
  await emit(emitter, 'REPORT_VALIDATED', input, { claimCount: validated.claims.length });
  return validated;
};
