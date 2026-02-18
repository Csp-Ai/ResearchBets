import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ControlPlaneEvent } from '../control-plane/events';
import type { ResearchReport } from '../evidence/evidenceSchema';

import type { IdempotencyRecord, RuntimeStore, SessionRecord, StoredBet } from './runtimeStore';

const createSupabaseClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured');
  }

  return createClient(url, key);
};

const SESSIONS_TABLE = 'runtime_sessions';
const SNAPSHOTS_TABLE = 'research_reports';
const BETS_TABLE = 'bets';
const EVENTS_TABLE = 'events_analytics';
const IDEMPOTENCY_KEYS_TABLE = 'idempotency_keys';

export class SupabaseRuntimeStore implements RuntimeStore {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? createSupabaseClient();
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const { data, error } = await this.client
      .from(SESSIONS_TABLE)
      .select('session_id, user_id, last_seen_at')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { sessionId: data.session_id as string, userId: data.user_id as string, lastSeenAt: data.last_seen_at as string };
  }

  async upsertSession(session: SessionRecord): Promise<void> {
    const { error } = await this.client
      .from(SESSIONS_TABLE)
      .upsert({ session_id: session.sessionId, user_id: session.userId, last_seen_at: session.lastSeenAt });
    if (error) throw error;
  }

  async saveSnapshot(report: ResearchReport): Promise<void> {
    const { error } = await this.client.from(SNAPSHOTS_TABLE).upsert({ report_id: report.reportId, report });
    if (error) throw error;
  }

  async getSnapshot(reportId: string): Promise<ResearchReport | null> {
    const { data, error } = await this.client.from(SNAPSHOTS_TABLE).select('report').eq('report_id', reportId).maybeSingle();
    if (error) throw error;
    return (data?.report as ResearchReport | undefined) ?? null;
  }

  async listBets(status?: StoredBet['status']): Promise<StoredBet[]> {
    let query = this.client.from(BETS_TABLE).select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((item) => ({
      id: item.id as string,
      userId: item.user_id as string,
      sessionId: item.session_id as string,
      snapshotId: (item.snapshot_id as string | null) ?? '',
      traceId: (item.trace_id as string | null) ?? '',
      runId: (item.run_id as string | null) ?? '',
      selection: item.selection as string,
      odds: Number(item.odds),
      stake: Number(item.stake),
      status: item.status as StoredBet['status'],
      outcome: (item.outcome as StoredBet['outcome']) ?? null,
      settledProfit: item.settled_profit == null ? null : Number(item.settled_profit),
      confidence: Number(item.confidence ?? 0),
      createdAt: item.created_at as string,
      settledAt: (item.settled_at as string | null) ?? null,
    }));
  }

  async saveBet(bet: StoredBet): Promise<void> {
    const { error } = await this.client.from(BETS_TABLE).upsert({
      id: bet.id,
      user_id: bet.userId,
      session_id: bet.sessionId,
      snapshot_id: bet.snapshotId,
      trace_id: bet.traceId,
      run_id: bet.runId,
      selection: bet.selection,
      odds: bet.odds,
      stake: bet.stake,
      status: bet.status,
      outcome: bet.outcome,
      settled_profit: bet.settledProfit,
      confidence: bet.confidence,
      created_at: bet.createdAt,
      settled_at: bet.settledAt,
    });
    if (error) throw error;
  }

  async getBet(betId: string): Promise<StoredBet | null> {
    const { data, error } = await this.client.from(BETS_TABLE).select('*').eq('id', betId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      userId: data.user_id as string,
      sessionId: data.session_id as string,
      snapshotId: (data.snapshot_id as string | null) ?? '',
      traceId: (data.trace_id as string | null) ?? '',
      runId: (data.run_id as string | null) ?? '',
      selection: data.selection as string,
      odds: Number(data.odds),
      stake: Number(data.stake),
      status: data.status as StoredBet['status'],
      outcome: (data.outcome as StoredBet['outcome']) ?? null,
      settledProfit: data.settled_profit == null ? null : Number(data.settled_profit),
      confidence: Number(data.confidence ?? 0),
      createdAt: data.created_at as string,
      settledAt: (data.settled_at as string | null) ?? null,
    };
  }

  async saveEvent(event: ControlPlaneEvent): Promise<void> {
    const { error } = await this.client.from(EVENTS_TABLE).insert({
      event_name: event.event_name,
      trace_id: event.trace_id,
      run_id: event.run_id,
      session_id: event.session_id ?? 'unknown',
      user_id: event.user_id ?? 'anonymous',
      properties_json: { ...event.properties, request_id: event.request_id, agent_id: event.agent_id, model_version: event.model_version },
      timestamp: event.timestamp,
    });
    if (error) throw error;
  }

  async getIdempotencyRecord<T>(endpoint: string, userId: string, key: string): Promise<IdempotencyRecord<T> | null> {
    const { data, error } = await this.client
      .from(IDEMPOTENCY_KEYS_TABLE)
      .select('endpoint, user_id, key, response_hash, response_json, created_at')
      .eq('endpoint', endpoint)
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      endpoint: data.endpoint as string,
      userId: data.user_id as string,
      key: data.key as string,
      responseHash: data.response_hash as string,
      response: data.response_json as T,
      createdAt: data.created_at as string,
    };
  }

  async saveIdempotencyRecord<T>(record: IdempotencyRecord<T>): Promise<void> {
    const { error } = await this.client.from(IDEMPOTENCY_KEYS_TABLE).upsert({
      endpoint: record.endpoint,
      user_id: record.userId,
      key: record.key,
      response_hash: record.responseHash,
      response_json: record.response,
      created_at: record.createdAt,
    });
    if (error) throw error;
  }
}
