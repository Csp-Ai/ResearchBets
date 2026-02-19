import { getSupabaseBrowserClient } from '@/services/supabaseClient';

import type { Run } from './types';

const STORAGE_KEY = 'rb:runs:v1';
const SUPABASE_TABLE = 'research_runs';

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
    const parsed = JSON.parse(raw) as Run[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const writeRuns = (runs: Run[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
};

export class LocalRunStore implements RunStore {
  async saveRun(run: Run): Promise<void> {
    const runs = readRuns().filter((existing) => existing.traceId !== run.traceId);
    runs.unshift(run);
    writeRuns(runs.slice(0, 50));
  }

  async updateRun(traceId: string, patch: Partial<Run>): Promise<Run | null> {
    const runs = readRuns();
    const index = runs.findIndex((run) => run.traceId === traceId);
    if (index < 0) return null;

    const current = runs[index];
    if (!current) return null;

    const updatedRun: Run = {
      ...current,
      ...patch,
      traceId,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };

    runs[index] = updatedRun;
    writeRuns(runs);
    return updatedRun;
  }

  async getRun(traceId: string): Promise<Run | null> {
    return readRuns().find((run) => run.traceId === traceId) ?? null;
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
    const client = getSupabaseBrowserClient();
    if (!client) {
      await this.local.saveRun(run);
      return;
    }

    const { error } = await client.from(SUPABASE_TABLE).upsert({ trace_id: run.traceId, payload: run });
    if (error) await this.local.saveRun(run);
  }

  async updateRun(traceId: string, patch: Partial<Run>): Promise<Run | null> {
    const existing = await this.getRun(traceId);
    if (!existing) return null;

    const merged: Run = {
      ...existing,
      ...patch,
      traceId,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };

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
      .maybeSingle<{ payload: Run }>();

    if (error || !data?.payload) return this.local.getRun(traceId);
    return data.payload;
  }

  async listRuns(limit: number): Promise<Run[]> {
    const client = getSupabaseBrowserClient();
    if (!client) return this.local.listRuns(limit);

    const { data, error } = await client
      .from(SUPABASE_TABLE)
      .select('payload')
      .order('updated_at', { ascending: false })
      .limit(limit)
      .returns<Array<{ payload: Run }>>();

    if (error || !data) return this.local.listRuns(limit);

    const runs = data.map((row) => row.payload).filter(Boolean);
    return runs.length > 0 ? runs : this.local.listRuns(limit);
  }
}

export const createRunStore = (): RunStore => {
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return hasSupabase ? new SupabaseRunStore() : new LocalRunStore();
};

export const runStore: RunStore = createRunStore();
