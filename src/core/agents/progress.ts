export type AgentTrack = 'baseline' | 'hybrid';

export interface AgentTrackState {
  agentKey: string;
  track: AgentTrack;
  progress: number;
  status: 'waiting' | 'running' | 'completed' | 'error';
  finalVerdict?: string;
}

export interface ConsolidatedAgentProgress {
  agentKey: string;
  progress: number;
  status: 'waiting' | 'running' | 'completed' | 'error';
  finalVerdict: string;
}

const TRACK_SUFFIX = /_(baseline|hybrid)$/;

export function normalizeAgentKey(raw: string): { baseKey: string; track: AgentTrack | null } {
  const match = raw.match(TRACK_SUFFIX);
  if (!match) return { baseKey: raw, track: null };
  return { baseKey: raw.replace(TRACK_SUFFIX, ''), track: match[1] as AgentTrack };
}

export function consolidateAgentProgress(states: AgentTrackState[], expectedAgents: string[], devMode = false): ConsolidatedAgentProgress[] {
  const map = new Map<string, AgentTrackState[]>();
  for (const state of states) {
    const normalized = normalizeAgentKey(state.agentKey);
    const key = normalized.baseKey;
    const track = state.track ?? normalized.track ?? 'baseline';
    const next = { ...state, agentKey: key, track };
    map.set(key, [...(map.get(key) ?? []), next]);
  }

  const consolidated = [...map.entries()].map(([agentKey, rows]) => {
    const cappedRows = rows.map((row) => ({ ...row, progress: Math.max(0, Math.min(100, row.progress)) }));
    const allComplete = ['baseline', 'hybrid'].every((track) => cappedRows.some((row) => row.track === track && row.status === 'completed'));
    const anyError = cappedRows.some((row) => row.status === 'error');
    const progress = Math.min(100, Math.round(cappedRows.reduce((sum, row) => sum + row.progress, 0) / Math.max(1, cappedRows.length)));
    const status: ConsolidatedAgentProgress['status'] = anyError ? 'error' : allComplete ? 'completed' : cappedRows.some((row) => row.status === 'running') ? 'running' : 'waiting';
    const finalVerdict = cappedRows.find((row) => row.finalVerdict)?.finalVerdict ?? (status === 'completed' ? 'completed_without_verdict' : 'pending');
    return { agentKey, progress, status, finalVerdict };
  });

  if (devMode) {
    const invalid = consolidated.find((row) => row.progress > 100);
    if (invalid) {
      console.warn('[agent-progress] progress exceeded 100; applying safe state', invalid);
      return consolidated.map((row) => ({ ...row, progress: Math.min(100, row.progress), status: row.status === 'running' ? 'waiting' : row.status }));
    }

    const unexpected = consolidated.filter((row) => !expectedAgents.includes(row.agentKey));
    if (unexpected.length > 0) {
      console.warn('[agent-progress] unexpected keys detected; applying safe fallback', unexpected.map((row) => row.agentKey));
      return consolidated.filter((row) => expectedAgents.includes(row.agentKey));
    }
  }

  return consolidated;
}
