import 'server-only';

import { randomUUID } from 'node:crypto';

import { buildStoredPostmortems, classifyBettorIdentity, generateAdvisorySignals, summarizeCredibility } from './analytics';
import { buildDemoBettorMemory } from './demo';
import type { AccountActivityImportRecord, ArtifactType, BettorArtifactRecord, BettorMemorySnapshot, ParsedSlipLegRecord, ParsedSlipRecord, VerificationStatus } from './types';
import { getSupabaseServiceClient } from '@/src/core/supabase/service';

const BUCKET = 'bettor-artifacts';

async function ensureProfileRow(bettorId: string) {
  const supabase = getSupabaseServiceClient();
  await supabase.from('profiles').upsert({ id: bettorId, user_id: bettorId }, { onConflict: 'id' });
}

function serviceAvailable() {
  try {
    getSupabaseServiceClient();
    return true;
  } catch {
    return false;
  }
}

export async function getBettorMemorySnapshot(bettorId?: string | null): Promise<BettorMemorySnapshot> {
  if (!bettorId || !serviceAvailable()) return buildDemoBettorMemory();
  const supabase = getSupabaseServiceClient();
  const [{ data: profile }, { data: artifacts }, { data: slips }, { data: activity }, { data: postmortems }] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, timezone, preferred_sportsbooks, bettor_identity, advisory_signals, historical_aggregates, created_at, updated_at').eq('id', bettorId).maybeSingle(),
    supabase.from('bettor_artifacts').select('*').eq('bettor_id', bettorId).order('upload_timestamp', { ascending: false }),
    supabase.from('bettor_slips').select('*, bettor_slip_legs(*)').eq('bettor_id', bettorId).order('created_at', { ascending: false }),
    supabase.from('bettor_account_activity_imports').select('*').eq('bettor_id', bettorId).order('created_at', { ascending: false }),
    supabase.from('bettor_postmortems').select('*').eq('bettor_id', bettorId).order('created_at', { ascending: false }),
  ]);

  const mappedSlips: ParsedSlipRecord[] = (slips ?? []).map((slip) => ({ ...slip, legs: ((slip as { bettor_slip_legs?: ParsedSlipLegRecord[] }).bettor_slip_legs ?? []) as ParsedSlipLegRecord[] }));
  const snapshot: BettorMemorySnapshot = {
    profile: {
      bettor_id: bettorId,
      username: profile?.username ?? null,
      display_name: (profile as { display_name?: string | null })?.display_name ?? null,
      timezone: (profile as { timezone?: string | null })?.timezone ?? 'UTC',
      preferred_sportsbooks: ((profile as { preferred_sportsbooks?: string[] | null })?.preferred_sportsbooks ?? []) as string[],
      bettor_identity: ((profile as { bettor_identity?: string | null })?.bettor_identity as BettorMemorySnapshot['profile']['bettor_identity']) ?? classifyBettorIdentity(mappedSlips),
      advisory_signals: ((profile as { advisory_signals?: string[] | null })?.advisory_signals ?? generateAdvisorySignals(mappedSlips).map((item) => item.label)) as string[],
      historical_aggregates: ((profile as { historical_aggregates?: Record<string, number | string | null> | null })?.historical_aggregates ?? {}) as Record<string, number | string | null>,
      created_at: profile?.created_at ?? new Date().toISOString(),
      updated_at: profile?.updated_at ?? new Date().toISOString(),
    },
    artifacts: ((artifacts ?? []) as BettorArtifactRecord[]),
    slips: mappedSlips,
    accountActivity: ((activity ?? []) as AccountActivityImportRecord[]),
    postmortems: ((postmortems ?? []) as BettorMemorySnapshot['postmortems']).length > 0 ? (postmortems as BettorMemorySnapshot['postmortems']) : buildStoredPostmortems(mappedSlips),
    mode: 'live',
    credibility: { basis: 'partial_data', label: 'Loading', detail: 'Loading bettor memory.' },
  };
  snapshot.credibility = summarizeCredibility(snapshot);
  return snapshot;
}

export async function saveUploadedArtifact(input: { bettorId: string; file: File; artifactType: ArtifactType; sourceSportsbook?: string | null; width?: number | null; height?: number | null; }): Promise<BettorArtifactRecord> {
  const supabase = getSupabaseServiceClient();
  await ensureProfileRow(input.bettorId);
  const artifactId = randomUUID();
  const extension = input.file.name.includes('.') ? input.file.name.split('.').pop() : 'bin';
  const storagePath = `${input.bettorId}/${artifactId}.${extension}`;
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const upload = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { contentType: input.file.type || 'application/octet-stream', upsert: false });
  if (upload.error) throw upload.error;
  const record: BettorArtifactRecord = {
    artifact_id: artifactId,
    bettor_id: input.bettorId,
    storage_path: storagePath,
    object_url: null,
    artifact_type: input.artifactType,
    source_sportsbook: input.sourceSportsbook ?? null,
    upload_timestamp: new Date().toISOString(),
    parse_status: 'pending',
    parser_version: 'demo-parser-v1',
    confidence_score: null,
    verification_status: 'unverified',
    raw_extracted_text: null,
    raw_parse_json: null,
    preview_metadata: { width: input.width ?? null, height: input.height ?? null, mime_type: input.file.type || null, size_bytes: input.file.size },
  };
  const inserted = await supabase.from('bettor_artifacts').insert(record).select('*').single();
  if (inserted.error) throw inserted.error;
  return inserted.data as BettorArtifactRecord;
}

export async function persistDemoParse(input: { bettorId: string; artifactId: string; artifactType: ArtifactType; rawText?: string | null; sourceSportsbook?: string | null; }): Promise<{ slip?: ParsedSlipRecord; accountActivity?: AccountActivityImportRecord }> {
  const supabase = getSupabaseServiceClient();
  await ensureProfileRow(input.bettorId);
  await supabase.from('bettor_artifacts').update({ parse_status: 'partial', parser_version: 'demo-parser-v1', confidence_score: 0.48, verification_status: 'needs_review', raw_extracted_text: input.rawText ?? null, raw_parse_json: { source: 'demo_parser', explicit_demo: true } }).eq('artifact_id', input.artifactId);

  if (input.artifactType === 'account_activity_screenshot') {
    const activity: Omit<AccountActivityImportRecord, 'created_at' | 'updated_at'> = {
      activity_import_id: randomUUID(), bettor_id: input.bettorId, source_artifact_id: input.artifactId, source_sportsbook: input.sourceSportsbook ?? null, beginning_balance: 500, end_balance: 535, deposited: 100, played_staked: 75, won_returned: 110, withdrawn: 0, rebated: 0, promotions_awarded: 10, promotions_played: 5, promotions_expired: 0, bets_placed: 3, bets_won: 2, activity_window_start: new Date(Date.now() - 7 * 86400000).toISOString(), activity_window_end: new Date().toISOString(), verification_status: 'needs_review', parse_quality: 'partial', confidence_score: 0.4,
    };
    const inserted = await supabase.from('bettor_account_activity_imports').insert(activity).select('*').single();
    if (inserted.error) throw inserted.error;
    return { accountActivity: inserted.data as AccountActivityImportRecord };
  }

  const createdAt = new Date().toISOString();
  const slipId = randomUUID();
  const verification: VerificationStatus = 'needs_review';
  const slip: Omit<ParsedSlipRecord, 'legs'> = {
    slip_id: slipId, bettor_id: input.bettorId, source_artifact_id: input.artifactId, sportsbook: input.sourceSportsbook ?? 'Unknown', placed_at: createdAt, settled_at: null, stake: 25, payout: null, potential_payout: 62.5, odds: 150, status: 'open', leg_count: 2, sport: 'Basketball', league: 'NBA', confidence_score: 0.48, parse_quality: 'partial', verification_status: verification, raw_source_reference: input.rawText ?? 'demo_parser', created_at: createdAt, updated_at: createdAt,
  };
  const insertedSlip = await supabase.from('bettor_slips').insert(slip).select('*').single();
  if (insertedSlip.error) throw insertedSlip.error;
  const legs: ParsedSlipLegRecord[] = [
    { leg_id: randomUUID(), slip_id: slipId, player_name: 'Unverified Player 1', team_name: null, market_type: 'Points', line: 22.5, over_under_or_side: 'over', odds: -110, result: null, event_descriptor: 'Needs review', sport: 'Basketball', league: 'NBA', confidence_score: 0.44, verification_status: verification, normalized_market_label: 'Points' },
    { leg_id: randomUUID(), slip_id: slipId, player_name: 'Unverified Player 2', team_name: null, market_type: 'Rebounds', line: 8.5, over_under_or_side: 'over', odds: -115, result: null, event_descriptor: 'Needs review', sport: 'Basketball', league: 'NBA', confidence_score: 0.42, verification_status: verification, normalized_market_label: 'Rebounds' },
  ];
  const insertedLegs = await supabase.from('bettor_slip_legs').insert(legs).select('*');
  if (insertedLegs.error) throw insertedLegs.error;
  return { slip: { ...(insertedSlip.data as ParsedSlipRecord), legs: insertedLegs.data as ParsedSlipLegRecord[] } };
}
