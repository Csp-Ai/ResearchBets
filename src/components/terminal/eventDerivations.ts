import type { ControlPlaneEvent } from '@/src/components/AgentNodeGraph';

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
}

function dedupeByRecent(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (!value || seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }
  return deduped;
}

export type InspectorAgentDetail = {
  id: string;
  eventName: string;
  timestamp?: string;
  confidence: number | null;
  assumptions: string[];
  sources: string[];
  modelVersion?: string;
  snippet: string;
  raw: Record<string, unknown>;
};

export type DerivedInspectorSummary = {
  confidence: number | null;
  assumptions: string[];
  sources: string[];
  agents: InspectorAgentDetail[];
  modelVersions: string[];
  updatedAt?: string;
  provenance: 'Live' | 'Demo';
  hasErrorEvents: boolean;
};

export function deriveInspectorSummary(events: ControlPlaneEvent[]): DerivedInspectorSummary {
  const assumptions: string[] = [];
  const sources: string[] = [];
  const agentsById = new Map<string, InspectorAgentDetail>();
  const modelVersions: string[] = [];

  let confidence: number | null = null;
  let updatedAt: string | undefined;
  let hasErrorEvents = false;

  for (const event of events) {
    const payload = asRecord(event.payload);
    assumptions.push(...normalizeStringList(payload.assumptions));
    sources.push(...normalizeStringList(payload.sources));

    if (typeof payload.confidence === 'number') {
      confidence = payload.confidence;
    }

    const modelVersion = typeof payload.model_version === 'string' ? payload.model_version : undefined;
    if (modelVersion) modelVersions.push(modelVersion);

    const eventHasError =
      event.event_name.toLowerCase().includes('error') ||
      Boolean(payload.error) ||
      (typeof payload.status === 'string' && payload.status.toLowerCase() === 'error');
    if (eventHasError) hasErrorEvents = true;

    const agentId = typeof payload.agent_id === 'string' ? payload.agent_id : undefined;
    if (agentId) {
      agentsById.set(agentId, {
        id: agentId,
        eventName: event.event_name,
        timestamp: event.created_at,
        confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
        assumptions: normalizeStringList(payload.assumptions),
        sources: normalizeStringList(payload.sources),
        modelVersion,
        snippet: JSON.stringify(payload, null, 2).slice(0, 700),
        raw: payload,
      });
    }

    updatedAt = event.created_at ?? updatedAt;
  }

  return {
    confidence,
    assumptions: dedupeByRecent(assumptions),
    sources: dedupeByRecent(sources),
    agents: [...agentsById.values()],
    modelVersions: dedupeByRecent(modelVersions),
    updatedAt,
    provenance: events.length > 0 ? 'Live' : 'Demo',
    hasErrorEvents,
  };
}

export type RunStatus = 'waiting' | 'running' | 'complete' | 'error';

export function deriveRunStatus(events: ControlPlaneEvent[]): RunStatus {
  if (events.length === 0) return 'waiting';
  const last = events[events.length - 1];
  if (!last) return "waiting";
  const payload = asRecord(last.payload);
  const name = last.event_name.toLowerCase();
  if (name.includes('error') || payload.error) return 'error';
  if (
    name.includes('complete') ||
    name.includes('completed') ||
    name.includes('finished') ||
    name.includes('saved') ||
    name.includes('logged')
  ) {
    return 'complete';
  }
  return 'running';
}

export function formatAgeLabel(value?: string): string {
  if (!value) return 'Updated just now';
  const ageMs = Math.max(0, Date.now() - new Date(value).getTime());
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}
