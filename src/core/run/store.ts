import { getSupabaseBrowserClient } from '@/services/supabaseClient';
import { buildSlipStructureReport, computeSlipIntelligence } from '@/src/core/slips/slipIntelligence';

import { normalizeRun } from '@/src/core/run/normalizeRun';
import type { Run } from './types';

const STORAGE_KEY = 'rb:runs:v1';
const SUPABASE_TABLE = 'research_runs';

const runIdOf = (run: Pick<Run, 'trace_id' | 'traceId'>): string => run.trace_id ?? run.traceId ?? '';

export interface RunStore {
  saveRun(run: Run): Promise<void>;
  updateRun(traceId: string, patch: Partial<Run>): Promise<Run | null>;
  getRun(traceId: string): Promise<Run | null>;
  listRuns(limit: number): Promise<Run[]>;
}

const readRuns = (): Run[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<Partial<Run> & { trace_id?: string; traceId?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((run) => {
        try {
          return normalizeRun(run);
        } catch {
          return null;
        }
      })
      .filter((run): run is Run => Boolean(run));
  } catch {
    return [];
  }
};


function fallbackLatestTraceIdFromRaw(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Array<{ trace_id?: string; traceId?: string; updatedAt?: string }>;
    if (!Array.isArray(parsed)) return null;
    const latest = [...parsed]
      .filter((run) => typeof run.trace_id === 'string' || typeof run.traceId === 'string')
      .sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''))[0];
    return latest?.trace_id ?? latest?.traceId ?? null;
  } catch {
    return null;
  }
}

const writeRuns = (runs: Run[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
};

const migrateLocalRuns = () => {
  const runs = readRuns();
  if (runs.length === 0 || typeof window === 'undefined') return;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as Array<{ trace_id?: string; traceId?: string }>;
    const needsMigration = parsed.some((run) => !run.trace_id && run.traceId);
    if (needsMigration) writeRuns(runs);
  } catch {
    // no-op
  }
};

export class LocalRunStore implements RunStore {
  constructor() {
    migrateLocalRuns();
  }

  async saveRun(run: Run): Promise<void> {
    const normalized = normalizeRun(run);
    const runId = runIdOf(normalized);
    const runs = readRuns().filter((existing) => runIdOf(existing) !== runId);
    runs.unshift(normalized);
    writeRuns(runs.slice(0, 50));
  }

  async updateRun(traceId: string, patch: Partial<Run>): Promise<Run | null> {
    const runs = readRuns();
    const index = runs.findIndex((run) => runIdOf(run) === traceId);
    if (index < 0) return null;

    const current = runs[index];
    if (!current) return null;

    const updatedRun = normalizeRun({
      ...current,
      ...patch,
      trace_id: traceId,
      traceId,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    });

    runs[index] = updatedRun;
    writeRuns(runs);
    return updatedRun;
  }

  async getRun(traceId: string): Promise<Run | null> {
    return readRuns().find((run) => runIdOf(run) === traceId) ?? null;
  }

  async listRuns(limit: number): Promise<Run[]> {
    return readRuns()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }
}

export class SupabaseRunStore implements RunStore {
  private local = new LocalRunStore();

  async saveRun(run: Run): Promise<void> {
    const normalized = normalizeRun(run);
    const client = getSupabaseBrowserClient();
    if (!client) {
      await this.local.saveRun(normalized);
      return;
    }

    const { error } = await client.from(SUPABASE_TABLE).upsert({ trace_id: normalized.trace_id, payload: normalized });
    if (error) await this.local.saveRun(normalized);
  }

  async updateRun(traceId: string, patch: Partial<Run>): Promise<Run | null> {
    const existing = await this.getRun(traceId);
    if (!existing) return null;

    const merged = normalizeRun({
      ...existing,
      ...patch,
      trace_id: traceId,
      traceId,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    });

    await this.saveRun(merged);
    return merged;
  }

  async getRun(traceId: string): Promise<Run | null> {
    const client = getSupabaseBrowserClient();
    if (!client) return this.local.getRun(traceId);

    const { data, error } = await client
      .from(SUPABASE_TABLE)
      .select('payload')
      .eq('trace_id', traceId)
      .maybeSingle<{ payload: Partial<Run> & { trace_id?: string; traceId?: string } }>();

    if (error || !data?.payload) return this.local.getRun(traceId);

    try {
      return normalizeRun(data.payload);
    } catch {
      return this.local.getRun(traceId);
    }
  }

  async listRuns(limit: number): Promise<Run[]> {
    const client = getSupabaseBrowserClient();
    if (!client) return this.local.listRuns(limit);

    const { data, error } = await client
      .from(SUPABASE_TABLE)
      .select('payload')
      .order('updated_at', { ascending: false })
      .limit(limit)
      .returns<Array<{ payload: Partial<Run> & { trace_id?: string; traceId?: string } }>>();

    if (error || !data) return this.local.listRuns(limit);

    const runs = data
      .map((row) => {
        try {
          return normalizeRun(row.payload);
        } catch {
          return null;
        }
      })
      .filter((run): run is Run => Boolean(run));
    return runs.length > 0 ? runs : this.local.listRuns(limit);
  }
}


export function getLatestTraceId(): string | null {
  const runs = readRuns()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const latest = runs[0];
  if (latest) return runIdOf(latest);
  return fallbackLatestTraceIdFromRaw();
}

export const createRunStore = (): RunStore => {
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return hasSupabase ? new SupabaseRunStore() : new LocalRunStore();
};

export const runStore: RunStore = createRunStore();

export type SlipWarningLeg = {
  id: string;
  player: string;
  marketType: string;
  line: string;
  odds?: string;
  game?: string;
};

export type InlineSlipWarnings = {
  weakestLeg: string | null;
  highCorrelation: boolean;
  overstacked: boolean;
};

export function computeInlineSlipWarnings(legs: SlipWarningLeg[]): InlineSlipWarnings {
  if (legs.length === 0) return { weakestLeg: null, highCorrelation: false, overstacked: false };

  const report = buildSlipStructureReport(legs.map((leg) => ({
    id: leg.id,
    player: leg.player,
    marketType: leg.marketType,
    line: leg.line,
    odds: leg.odds,
    game: leg.game
  })));
  const intel = computeSlipIntelligence(legs.map((leg) => ({
    id: leg.id,
    player: leg.player,
    marketType: leg.marketType,
    line: leg.line,
    odds: leg.odds,
    game: leg.game
  })));

  const weakestLegId = report.weakest_leg_id;
  const weakestLegData = weakestLegId ? report.legs.find((leg) => leg.leg_id === weakestLegId) : undefined;
  const weakestLeg = weakestLegData ? `${weakestLegData.player ?? 'Unknown'} ${weakestLegData.market} ${weakestLegData.line ?? ''}`.trim() : null;
  const overstacked = report.script_clusters.some((cluster) => cluster.leg_ids.length >= 4)
    || intel.exposureSummary.topGames.some((game) => game.count >= 4);

  return {
    weakestLeg,
    highCorrelation: intel.correlationScore >= 55 || intel.sameGameStack,
    overstacked
  };
}
