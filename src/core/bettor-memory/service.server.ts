import 'server-only';

import { randomUUID } from 'node:crypto';

import { buildStoredPostmortems, classifyBettorIdentity, generateAdvisorySignals, summarizeCredibility } from './analytics';
import { buildDemoBettorMemory } from './demo';
import { buildTextExtraction, mapCandidateActivityToRecord, mapCandidateLegToRecord, mapCandidateSlipToRecord, runParser } from './parser';
import { buildAccountActivityReviewFields, buildSlipLegReviewFields, buildSlipReviewFields, deriveDataSourceProvenance, deriveParserConfidenceLabel, deriveVerificationStatus, preferVerifiedRecords } from './review';
import type { AccountActivityImportRecord, ArtifactReviewRecord, ArtifactType, BettorArtifactRecord, BettorMemorySnapshot, ParsedSlipLegRecord, ParsedSlipRecord, VerificationStatus } from './types';
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

const isDemoParse = (value: unknown) => Boolean(value && typeof value === 'object' && ('explicit_demo' in (value as Record<string, unknown>) || (value as Record<string, unknown>).source === 'demo_parser' || (value as Record<string, unknown>).source === 'demo'));

function normalizeArtifact(record: BettorArtifactRecord): BettorArtifactRecord {
  const parserConfidenceLabel = deriveParserConfidenceLabel(record.confidence_score);
  const currentStatus = record.verification_status;
  const status = currentStatus === 'unverified'
    ? deriveVerificationStatus({ hasParse: record.parse_status !== 'pending', isDemo: isDemoParse(record.raw_parse_json), parserConfidence: record.confidence_score, hasHumanReview: false })
    : currentStatus;
  return {
    ...record,
    verification_status: status,
    parser_confidence_label: parserConfidenceLabel,
    data_source: deriveDataSourceProvenance(status, isDemoParse(record.raw_parse_json)),
  };
}

function normalizeSlip(slip: ParsedSlipRecord): ParsedSlipRecord {
  const status = slip.verification_status === 'unverified'
    ? deriveVerificationStatus({ hasParse: true, isDemo: isDemoParse(slip.parse_snapshot_json), parserConfidence: slip.confidence_score, hasHumanReview: false })
    : slip.verification_status;
  return {
    ...slip,
    verification_status: status,
    data_source: deriveDataSourceProvenance(status, isDemoParse(slip.parse_snapshot_json)),
    legs: slip.legs.map((leg) => ({
      ...leg,
      verification_status: leg.verification_status === 'unverified' ? status : leg.verification_status,
      data_source: deriveDataSourceProvenance(leg.verification_status === 'unverified' ? status : leg.verification_status, isDemoParse(leg.parse_snapshot_json)),
    })),
  };
}

function normalizeActivity(record: AccountActivityImportRecord): AccountActivityImportRecord {
  const status = record.verification_status === 'unverified'
    ? deriveVerificationStatus({ hasParse: true, isDemo: isDemoParse(record.parse_snapshot_json), parserConfidence: record.confidence_score, hasHumanReview: false })
    : record.verification_status;
  return {
    ...record,
    verification_status: status,
    data_source: deriveDataSourceProvenance(status, isDemoParse(record.parse_snapshot_json)),
  };
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

  const mappedSlips: ParsedSlipRecord[] = preferVerifiedRecords((slips ?? []).map((slip) => normalizeSlip({ ...slip, legs: ((slip as { bettor_slip_legs?: ParsedSlipLegRecord[] }).bettor_slip_legs ?? []) as ParsedSlipLegRecord[] })));
  const mappedActivity = preferVerifiedRecords(((activity ?? []) as AccountActivityImportRecord[]).map(normalizeActivity));
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
    artifacts: ((artifacts ?? []) as BettorArtifactRecord[]).map(normalizeArtifact),
    slips: mappedSlips,
    accountActivity: mappedActivity,
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
    parser_version: 'parser-runtime/1.0.0',
    parser_adapter: null,
    confidence_score: null,
    verification_status: 'uploaded',
    parser_confidence_label: 'unknown',
    data_source: 'raw_upload',
    raw_extracted_text: null,
    raw_parse_json: null,
    normalized_parse_json: null,
    parser_warnings_json: null,
    parser_errors_json: null,
    parser_provenance_json: null,
    review_notes_json: null,
    last_reviewed_at: null,
    preview_metadata: { width: input.width ?? null, height: input.height ?? null, mime_type: input.file.type || null, size_bytes: input.file.size },
  };
  const inserted = await supabase.from('bettor_artifacts').insert(record).select('*').single();
  if (inserted.error) throw inserted.error;
  return normalizeArtifact(inserted.data as BettorArtifactRecord);
}

export async function parseArtifact(input: { bettorId: string; artifactId: string; artifactType: ArtifactType; rawText?: string | null; sourceSportsbook?: string | null; }): Promise<{ parser_mode: 'adapter' | 'generic_fallback' | 'demo'; parser_result: Record<string, unknown>; slip?: ParsedSlipRecord; accountActivity?: AccountActivityImportRecord }> {
  const supabase = getSupabaseServiceClient();
  await ensureProfileRow(input.bettorId);
  const extraction = buildTextExtraction(input.rawText);
  const parserResult = runParser({ artifact_type: input.artifactType, source_sportsbook_hint: input.sourceSportsbook ?? null, extraction });

  const isDemo = parserResult.recommended_next_state === 'parsed_demo';
  const verificationStatus: VerificationStatus = isDemo
    ? 'parsed_demo'
    : parserResult.recommended_next_state === 'parsed_unverified'
      ? 'parsed_unverified'
      : 'needs_review';
  const parserMode = parserResult.adapter.name === 'generic_fallback' ? 'generic_fallback' : isDemo ? 'demo' : 'adapter';

  await supabase.from('bettor_artifacts').update({
    parse_status: parserResult.parse_status,
    parser_version: parserResult.adapter.version,
    parser_adapter: parserResult.adapter.name,
    confidence_score: parserResult.confidence_score,
    verification_status: verificationStatus,
    data_source: isDemo ? 'demo_parse' : parserResult.parse_status === 'failed' ? 'raw_upload' : 'parser_output',
    raw_extracted_text: input.rawText ?? null,
    raw_parse_json: { adapter: parserResult.adapter, classification: parserResult.classification, raw_adapter_output: parserResult.raw_adapter_output, state: parserResult.state, explicit_demo: isDemo },
    normalized_parse_json: parserResult.normalized as unknown as Record<string, unknown>,
    parser_warnings_json: parserResult.warnings,
    parser_errors_json: parserResult.errors,
    parser_provenance_json: { ...parserResult.provenance, recommended_next_state: parserResult.recommended_next_state },
  }).eq('artifact_id', input.artifactId).eq('bettor_id', input.bettorId);

  if (parserResult.normalized.account_activity) {
    const existingDelete = await supabase.from('bettor_account_activity_imports').delete().eq('bettor_id', input.bettorId).eq('source_artifact_id', input.artifactId);
    if (existingDelete.error) throw existingDelete.error;
    const activityPayload = { activity_import_id: randomUUID(), ...mapCandidateActivityToRecord(parserResult.normalized.account_activity, input.bettorId, input.artifactId, verificationStatus), data_source: isDemo ? 'demo_parse' : 'parser_output' };
    const inserted = await supabase.from('bettor_account_activity_imports').insert(activityPayload).select('*').single();
    if (inserted.error) throw inserted.error;
    return { parser_mode: parserMode, parser_result: parserResult as unknown as Record<string, unknown>, accountActivity: normalizeActivity(inserted.data as AccountActivityImportRecord) };
  }

  if (parserResult.normalized.slip) {
    const deleteLegs = await supabase.from('bettor_slips').select('slip_id').eq('bettor_id', input.bettorId).eq('source_artifact_id', input.artifactId);
    const slipIds = (deleteLegs.data ?? []).map((row: { slip_id: string }) => row.slip_id);
    if (slipIds.length) {
      const legDelete = await supabase.from('bettor_slip_legs').delete().in('slip_id', slipIds);
      if (legDelete.error) throw legDelete.error;
      const slipDelete = await supabase.from('bettor_slips').delete().in('slip_id', slipIds);
      if (slipDelete.error) throw slipDelete.error;
    }
    const createdAt = new Date().toISOString();
    const slipId = randomUUID();
    const slipPayload = { slip_id: slipId, ...mapCandidateSlipToRecord(parserResult.normalized.slip, input.bettorId, input.artifactId, verificationStatus), data_source: isDemo ? 'demo_parse' : 'parser_output', created_at: createdAt, updated_at: createdAt };
    const insertedSlip = await supabase.from('bettor_slips').insert(slipPayload).select('*').single();
    if (insertedSlip.error) throw insertedSlip.error;
    const legPayloads = parserResult.normalized.slip.legs.map((leg) => ({ leg_id: randomUUID(), ...mapCandidateLegToRecord(leg, slipId, verificationStatus), data_source: isDemo ? 'demo_parse' : 'parser_output' }));
    if (legPayloads.length > 0) {
      const insertedLegs = await supabase.from('bettor_slip_legs').insert(legPayloads).select('*');
      if (insertedLegs.error) throw insertedLegs.error;
      return { parser_mode: parserMode, parser_result: parserResult as unknown as Record<string, unknown>, slip: normalizeSlip({ ...(insertedSlip.data as ParsedSlipRecord), legs: insertedLegs.data as ParsedSlipLegRecord[] }) };
    }
    return { parser_mode: parserMode, parser_result: parserResult as unknown as Record<string, unknown>, slip: normalizeSlip({ ...(insertedSlip.data as ParsedSlipRecord), legs: [] }) };
  }

  return { parser_mode: parserMode, parser_result: parserResult as unknown as Record<string, unknown> };
}

export async function createArtifactPreviewUrl(bettorId: string, artifactId: string) {
  const supabase = getSupabaseServiceClient();
  const { data: artifact, error } = await supabase.from('bettor_artifacts').select('artifact_id, bettor_id, storage_path').eq('artifact_id', artifactId).eq('bettor_id', bettorId).single();
  if (error || !artifact) throw error ?? new Error('Artifact not found.');
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(artifact.storage_path, 60 * 10);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

export async function getArtifactReviewRecord(bettorId: string, artifactId: string): Promise<ArtifactReviewRecord> {
  const supabase = getSupabaseServiceClient();
  const [{ data: artifact, error: artifactError }, { data: slip }, { data: activity }] = await Promise.all([
    supabase.from('bettor_artifacts').select('*').eq('artifact_id', artifactId).eq('bettor_id', bettorId).single(),
    supabase.from('bettor_slips').select('*').eq('bettor_id', bettorId).eq('source_artifact_id', artifactId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('bettor_account_activity_imports').select('*').eq('bettor_id', bettorId).eq('source_artifact_id', artifactId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (artifactError || !artifact) throw artifactError ?? new Error('Artifact not found.');
  const signedUrl = await createArtifactPreviewUrl(bettorId, artifactId).catch(() => null);
  let slipWithLegs: ParsedSlipRecord | null = null;
  if (slip) {
    const { data: slipLegs } = await supabase.from('bettor_slip_legs').select('*').eq('slip_id', slip.slip_id).order('created_at', { ascending: true });
    slipWithLegs = normalizeSlip({ ...(slip as ParsedSlipRecord), legs: (slipLegs ?? []) as ParsedSlipLegRecord[] });
  }
  const normalizedArtifact = normalizeArtifact(artifact as BettorArtifactRecord);
  const normalizedActivity = activity ? normalizeActivity(activity as AccountActivityImportRecord) : null;
  return {
    artifact: { ...normalizedArtifact, preview_url: signedUrl },
    slip: slipWithLegs ? { ...slipWithLegs, fields: buildSlipReviewFields(slipWithLegs), legs: slipWithLegs.legs.map((leg) => ({ ...leg, fields: buildSlipLegReviewFields(leg) })) } : null,
    accountActivity: normalizedActivity ? { ...normalizedActivity, fields: buildAccountActivityReviewFields(normalizedActivity) } : null,
    review: {
      parse_snapshot: normalizedArtifact.raw_parse_json ?? slipWithLegs?.parse_snapshot_json ?? normalizedActivity?.parse_snapshot_json ?? null,
      verified_snapshot: slipWithLegs?.verified_snapshot_json ?? normalizedActivity?.verified_snapshot_json ?? null,
      last_reviewed_at: normalizedArtifact.last_reviewed_at ?? slipWithLegs?.last_reviewed_at ?? normalizedActivity?.last_reviewed_at ?? null,
      verification_status: normalizedArtifact.verification_status,
      parser_confidence: normalizedArtifact.confidence_score,
      parser_confidence_label: normalizedArtifact.parser_confidence_label ?? 'unknown',
      data_source: normalizedArtifact.data_source,
      needs_human_review: normalizedArtifact.verification_status !== 'verified',
      review_reason: normalizedArtifact.verification_status === 'verified' ? 'Verified bettor-reviewed record is active in analytics.' : 'Ambiguous parser output should be checked field-by-field before it influences bettor memory.',
      parser_adapter: normalizedArtifact.parser_adapter ?? null,
      recommended_next_state: ((normalizedArtifact.parser_provenance_json as { recommended_next_state?: ArtifactReviewRecord['review']['recommended_next_state'] } | null)?.recommended_next_state ?? null),
      parser_warnings: normalizedArtifact.parser_warnings_json ?? [],
      parser_errors: normalizedArtifact.parser_errors_json ?? [],
      parser_provenance: normalizedArtifact.parser_provenance_json ?? null,
    },
  };
}

export async function saveArtifactReview(input: {
  bettorId: string;
  artifactId: string;
  verificationStatus: 'verified' | 'rejected' | 'needs_review';
  reviewNotes?: string | null;
  slip?: Partial<Omit<ParsedSlipRecord, 'bettor_id' | 'source_artifact_id' | 'created_at' | 'updated_at' | 'legs'>> & { slip_id: string; status: ParsedSlipRecord['status']; legs: Array<Partial<ParsedSlipLegRecord> & { leg_id?: string | undefined }> };
  accountActivity?: Partial<Omit<AccountActivityImportRecord, 'bettor_id' | 'source_artifact_id' | 'created_at' | 'updated_at'>> & { activity_import_id: string };
}): Promise<ArtifactReviewRecord> {
  const supabase = getSupabaseServiceClient();
  const now = new Date().toISOString();
  const current = await getArtifactReviewRecord(input.bettorId, input.artifactId);

  await supabase.from('bettor_artifacts').update({
    verification_status: input.verificationStatus,
    data_source: input.verificationStatus === 'verified' ? 'bettor_verified' : current.artifact.data_source,
    last_reviewed_at: now,
    review_notes_json: { note: input.reviewNotes ?? null, reviewed_at: now, prior_verification_status: current.artifact.verification_status },
  }).eq('artifact_id', input.artifactId).eq('bettor_id', input.bettorId);

  if (input.slip && current.slip) {
    const existing = current.slip;
    const verifiedSnapshot = { ...input.slip, legs: input.slip.legs };
    const nextSlip = {
      sportsbook: input.slip.sportsbook,
      placed_at: input.slip.placed_at,
      settled_at: input.slip.settled_at,
      stake: input.slip.stake,
      payout: input.slip.payout,
      potential_payout: input.slip.potential_payout,
      odds: input.slip.odds,
      status: input.slip.status,
      leg_count: input.slip.legs.length,
      sport: input.slip.sport,
      league: input.slip.league,
      verification_status: input.verificationStatus,
      data_source: input.verificationStatus === 'verified' ? 'bettor_verified' : existing.data_source,
      verified_snapshot_json: verifiedSnapshot,
      parse_snapshot_json: existing.parse_snapshot_json ?? existing.verified_snapshot_json ?? existing,
      last_reviewed_at: now,
      updated_at: now,
    };
    const slipUpdate = await supabase.from('bettor_slips').update(nextSlip).eq('slip_id', existing.slip_id).eq('bettor_id', input.bettorId);
    if (slipUpdate.error) throw slipUpdate.error;

    const existingLegIds = new Set(existing.legs.map((leg) => leg.leg_id));
    const incomingLegIds = new Set(input.slip.legs.filter((leg) => leg.leg_id && existingLegIds.has(leg.leg_id)).map((leg) => leg.leg_id));
    const toDelete = existing.legs.filter((leg) => !incomingLegIds.has(leg.leg_id)).map((leg) => leg.leg_id);
    if (toDelete.length > 0) {
      const legDelete = await supabase.from('bettor_slip_legs').delete().in('leg_id', toDelete);
      if (legDelete.error) throw legDelete.error;
    }
    for (const [index, leg] of input.slip.legs.entries()) {
      const legId = leg.leg_id && existingLegIds.has(leg.leg_id) ? leg.leg_id : randomUUID();
      const existingLeg = existing.legs.find((item) => item.leg_id === leg.leg_id) ?? null;
      const payload = {
        leg_id: legId,
        slip_id: existing.slip_id,
        player_name: leg.player_name,
        team_name: leg.team_name,
        market_type: leg.market_type,
        line: leg.line,
        over_under_or_side: leg.over_under_or_side,
        odds: leg.odds,
        result: leg.result,
        event_descriptor: leg.event_descriptor,
        sport: leg.sport,
        league: leg.league,
        confidence_score: leg.confidence_score ?? existingLeg?.confidence_score ?? existing.confidence_score ?? null,
        verification_status: input.verificationStatus,
        normalized_market_label: leg.normalized_market_label,
        data_source: input.verificationStatus === 'verified' ? 'bettor_verified' : existingLeg?.data_source ?? existing.data_source,
        parse_snapshot_json: existingLeg?.parse_snapshot_json ?? existing.parse_snapshot_json ?? leg,
        verified_snapshot_json: { ...leg, review_index: index },
        last_reviewed_at: now,
      };
      const result = existingLeg
        ? await supabase.from('bettor_slip_legs').update(payload).eq('leg_id', legId)
        : await supabase.from('bettor_slip_legs').insert(payload);
      if (result.error) throw result.error;
    }
  }

  if (input.accountActivity && current.accountActivity) {
    const existing = current.accountActivity;
    const activityUpdate = await supabase.from('bettor_account_activity_imports').update({
      source_sportsbook: input.accountActivity.source_sportsbook,
      beginning_balance: input.accountActivity.beginning_balance,
      end_balance: input.accountActivity.end_balance,
      deposited: input.accountActivity.deposited,
      played_staked: input.accountActivity.played_staked,
      won_returned: input.accountActivity.won_returned,
      withdrawn: input.accountActivity.withdrawn,
      rebated: input.accountActivity.rebated,
      promotions_awarded: input.accountActivity.promotions_awarded,
      promotions_played: input.accountActivity.promotions_played,
      promotions_expired: input.accountActivity.promotions_expired,
      bets_placed: input.accountActivity.bets_placed,
      bets_won: input.accountActivity.bets_won,
      activity_window_start: input.accountActivity.activity_window_start,
      activity_window_end: input.accountActivity.activity_window_end,
      verification_status: input.verificationStatus,
      data_source: input.verificationStatus === 'verified' ? 'bettor_verified' : existing.data_source,
      parse_snapshot_json: existing.parse_snapshot_json ?? existing,
      verified_snapshot_json: input.accountActivity,
      last_reviewed_at: now,
      updated_at: now,
    }).eq('activity_import_id', existing.activity_import_id).eq('bettor_id', input.bettorId);
    if (activityUpdate.error) throw activityUpdate.error;
  }

  return getArtifactReviewRecord(input.bettorId, input.artifactId);
}

export async function getSlipForPostmortem(bettorId: string, slipId: string): Promise<ParsedSlipRecord | null> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from('bettor_slips').select('*, bettor_slip_legs(*)').eq('bettor_id', bettorId).eq('slip_id', slipId).maybeSingle();
  if (!data) return null;
  return normalizeSlip({ ...(data as ParsedSlipRecord), legs: ((data as { bettor_slip_legs?: ParsedSlipLegRecord[] }).bettor_slip_legs ?? []) as ParsedSlipLegRecord[] });
}
