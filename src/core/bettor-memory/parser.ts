import type { AccountActivityImportRecord, ArtifactType, ParseStatus, ParsedSlipLegRecord, ParsedSlipRecord, SlipStatus, VerificationStatus } from './types';

export type ParserAdapterName = 'fanduel' | 'draftkings' | 'prizepicks' | 'generic_fallback' | 'demo_parser';
export type ParserWarningCategory = 'classification_weak' | 'ocr_limited' | 'field_missing' | 'field_ambiguous' | 'layout_mismatch' | 'unsupported_artifact' | 'unsupported_market';
export type ParserErrorCategory = 'adapter_selection_failed' | 'ocr_missing' | 'artifact_not_supported' | 'layout_unreadable' | 'parse_contract_failed';
export type ParserRecommendedNextState = 'needs_review' | 'parsed_unverified' | 'parsed_demo' | 'parse_failed';
export type ParserRunState = 'classified' | 'parsed' | 'partial' | 'failed' | 'demo_fallback';
export type ParserConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';
export type SportsbookName = 'FanDuel' | 'DraftKings' | 'PrizePicks';

export type ParserSourceTextLine = { index: number; text: string; normalized: string };
export type ParserTextExtraction = { raw_text: string; lines: ParserSourceTextLine[]; token_count: number; quality: 'high' | 'medium' | 'low' | 'missing' };
export type ParserEvidence = { line_indexes: number[]; snippets: string[]; rationale?: string | null };
export type ParserFieldValue<T> = { value: T; confidence: number | null; confidence_label: ParserConfidenceLevel; provenance: ParserEvidence | null; source: 'parser' | 'inferred' | 'missing' };
export type ParserWarning = { category: ParserWarningCategory; code: string; message: string; field?: string | null; leg_index?: number | null };
export type ParserError = { category: ParserErrorCategory; code: string; message: string; recoverable: boolean };

export type ParsedSlipLegCandidate = {
  player_name: ParserFieldValue<string | null>;
  team_name: ParserFieldValue<string | null>;
  market_type: ParserFieldValue<string | null>;
  line: ParserFieldValue<number | null>;
  over_under_or_side: ParserFieldValue<string | null>;
  odds: ParserFieldValue<number | null>;
  result: ParserFieldValue<'won' | 'lost' | 'pushed' | 'unknown'>;
  event_descriptor: ParserFieldValue<string | null>;
  sport: ParserFieldValue<string | null>;
  league: ParserFieldValue<string | null>;
  normalized_market_label: ParserFieldValue<string | null>;
  confidence_score: number | null;
  warnings: ParserWarning[];
};

export type ParsedSlipCandidate = {
  sportsbook: ParserFieldValue<string | null>;
  placed_at: ParserFieldValue<string | null>;
  settled_at: ParserFieldValue<string | null>;
  stake: ParserFieldValue<number | null>;
  payout: ParserFieldValue<number | null>;
  potential_payout: ParserFieldValue<number | null>;
  odds: ParserFieldValue<number | null>;
  status: ParserFieldValue<SlipStatus>;
  sport: ParserFieldValue<string | null>;
  league: ParserFieldValue<string | null>;
  raw_source_reference: ParserFieldValue<string | null>;
  confidence_score: number | null;
  parse_quality: ParseStatus;
  leg_count: number;
  legs: ParsedSlipLegCandidate[];
  warnings: ParserWarning[];
};

export type ParsedAccountActivityCandidate = {
  source_sportsbook: ParserFieldValue<string | null>;
  beginning_balance: ParserFieldValue<number | null>;
  end_balance: ParserFieldValue<number | null>;
  deposited: ParserFieldValue<number | null>;
  played_staked: ParserFieldValue<number | null>;
  won_returned: ParserFieldValue<number | null>;
  withdrawn: ParserFieldValue<number | null>;
  rebated: ParserFieldValue<number | null>;
  promotions_awarded: ParserFieldValue<number | null>;
  promotions_played: ParserFieldValue<number | null>;
  promotions_expired: ParserFieldValue<number | null>;
  bets_placed: ParserFieldValue<number | null>;
  bets_won: ParserFieldValue<number | null>;
  activity_window_start: ParserFieldValue<string | null>;
  activity_window_end: ParserFieldValue<string | null>;
  confidence_score: number | null;
  parse_quality: ParseStatus;
  warnings: ParserWarning[];
};

export type ParserSelection = { adapter: ParserAdapterName; confidence: number; reasons: string[]; source_sportsbook_hint: string | null };

export type ParserContext = {
  artifact_type: ArtifactType;
  source_sportsbook_hint?: string | null;
  extraction: ParserTextExtraction;
};

export type ParserResult = {
  adapter: { name: ParserAdapterName; version: string };
  classification: ParserSelection;
  state: ParserRunState;
  parse_status: ParseStatus;
  recommended_next_state: ParserRecommendedNextState;
  confidence_score: number | null;
  confidence_label: ParserConfidenceLevel;
  warnings: ParserWarning[];
  errors: ParserError[];
  provenance: { extraction_quality: ParserTextExtraction['quality']; source_sportsbook_hint: string | null; recognized_sportsbook: string | null; raw_text_line_count: number; notes: string[] };
  raw_adapter_output: Record<string, unknown> | null;
  normalized: { slip: ParsedSlipCandidate | null; account_activity: ParsedAccountActivityCandidate | null };
};

export type BettorMemoryParserAdapter = {
  name: ParserAdapterName;
  version: string;
  supports: (context: ParserContext) => { score: number; reasons: string[] };
  parse: (context: ParserContext) => ParserResult;
};

const toConfidenceLabel = (score: number | null | undefined): ParserConfidenceLevel => {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'unknown';
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
};

const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9+.-]+/g, ' ').trim();
const moneyPattern = /\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;
const oddsPattern = /(^|\s)([+-][0-9]{2,4})(?=\s|$)/;

export function buildTextExtraction(rawText?: string | null): ParserTextExtraction {
  const raw = (rawText ?? '').replace(/\r/g, '\n');
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => ({ index, text: line, normalized: normalized(line) }));
  const token_count = lines.reduce((sum, line) => sum + line.normalized.split(/\s+/).filter(Boolean).length, 0);
  const quality: ParserTextExtraction['quality'] = !raw.trim() ? 'missing' : lines.length >= 8 && token_count >= 20 ? 'high' : lines.length >= 4 ? 'medium' : 'low';
  return { raw_text: raw, lines, token_count, quality };
}

const parserField = <T,>(value: T, confidence: number | null, provenance: ParserEvidence | null, source: ParserFieldValue<T>['source'] = value == null ? 'missing' : 'parser'): ParserFieldValue<T> => ({ value, confidence, confidence_label: toConfidenceLabel(confidence), provenance, source });
const evidenceForLine = (line: ParserSourceTextLine, rationale?: string): ParserEvidence => ({ line_indexes: [line.index], snippets: [line.text], rationale: rationale ?? null });
const averageConfidence = (scores: Array<number | null | undefined>) => {
  const values = scores.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : null;
};

function parseMoneyFromLine(line: ParserSourceTextLine, field: string, labelHints: string[]): { field: ParserFieldValue<number | null>; warning?: ParserWarning } {
  const hasHint = labelHints.some((hint) => line.normalized.includes(hint));
  const match = line.text.match(moneyPattern);
  if (hasHint && match) {
    return { field: parserField(Number((match[1] ?? '0').replace(/,/g, '')), 0.9, evidenceForLine(line, `${field} matched on labeled money row`)) };
  }
  return {
    field: parserField<number | null>(null, null, hasHint ? evidenceForLine(line, `${field} label present but amount unreadable`) : null),
    warning: hasHint ? { category: 'field_ambiguous', code: `ambiguous_${field}`, message: `${field} row was detected but could not be read confidently.`, field } : undefined,
  };
}

function parseOdds(lines: ParserSourceTextLine[]): ParserFieldValue<number | null> {
  const line = lines.find((candidate) => oddsPattern.test(candidate.text));
  if (!line) return parserField<number | null>(null, null, null);
  const match = line.text.match(oddsPattern);
  return parserField<number | null>(match?.[2] ? Number(match[2]) : null, match ? 0.82 : null, evidenceForLine(line, 'American odds token detected'));
}

function deriveStatus(lines: ParserSourceTextLine[]): ParserFieldValue<SlipStatus> {
  const joined = lines.map((line) => line.normalized).join(' ');
  if (/settled|won|you won/.test(joined)) return parserField('won', 0.65, null, 'inferred');
  if (/lost|you lost/.test(joined)) return parserField('lost', 0.65, null, 'inferred');
  if (/open|live/.test(joined)) return parserField('open', 0.55, null, 'inferred');
  return parserField('unknown', 0.3, null, 'inferred');
}

function titleCaseWords(value: string): string {
  return value.split(/\s+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function parseLegLine(line: ParserSourceTextLine): ParsedSlipLegCandidate | null {
  const match = line.text.match(/^(.+?)\s+(over|under|more|less)\s+([0-9]+(?:\.[0-9]+)?)\s+([A-Za-z][A-Za-z .]+?)(?:\s*\(([+-][0-9]{2,4})\))?$/i);
  if (!match) return null;
  const player = titleCaseWords((match[1] ?? '').replace(/\s+/g, ' ').trim());
  const rawSide = (match[2] ?? '').toLowerCase();
  const side = rawSide === 'more' ? 'over' : rawSide === 'less' ? 'under' : rawSide;
  const market = titleCaseWords((match[4] ?? '').trim());
  const odds = match[5] ? Number(match[5]) : null;
  return {
    player_name: parserField(player, 0.78, evidenceForLine(line, 'Leg line matched player + side + line + market structure')),
    team_name: parserField<string | null>(null, null, null),
    market_type: parserField(market, 0.76, evidenceForLine(line, 'Market text matched in leg line')),
    line: parserField(Number(match[3] ?? '0'), 0.76, evidenceForLine(line, 'Numeric line matched in leg line')),
    over_under_or_side: parserField(side, 0.82, evidenceForLine(line, 'Over/under side matched in leg line')),
    odds: parserField(odds, odds == null ? null : 0.72, odds == null ? null : evidenceForLine(line, 'Inline odds matched in leg line')),
    result: parserField('unknown', 0.25, null, 'inferred'),
    event_descriptor: parserField<string | null>(null, null, null),
    sport: parserField<string | null>(null, null, null),
    league: parserField<string | null>(null, null, null),
    normalized_market_label: parserField(market, 0.72, evidenceForLine(line, 'Normalized market copied from matched market text')),
    confidence_score: 0.77,
    warnings: [],
  };
}

function fanDuelSupports(context: ParserContext) {
  const joined = context.extraction.lines.map((line) => line.normalized).join(' ');
  let score = 0;
  const reasons: string[] = [];
  if (/fanduel/.test(joined)) { score += 0.7; reasons.push('OCR text includes FanDuel branding.'); }
  if (/total bet/.test(joined) || /to return/.test(joined)) { score += 0.18; reasons.push('FanDuel stake/return rows detected.'); }
  if ((context.source_sportsbook_hint ?? '').toLowerCase().includes('fan')) { score += 0.2; reasons.push('Artifact sportsbook hint points to FanDuel.'); }
  return { score: Math.min(score, 0.98), reasons };
}

function draftKingsSupports(context: ParserContext) {
  const joined = context.extraction.lines.map((line) => line.normalized).join(' ');
  let score = 0;
  const reasons: string[] = [];
  if (/draftkings/.test(joined)) { score += 0.72; reasons.push('OCR text includes DraftKings branding.'); }
  if (/bet amount/.test(joined) || /to win/.test(joined) || /total payout/.test(joined)) { score += 0.16; reasons.push('DraftKings amount rows detected.'); }
  if ((context.source_sportsbook_hint ?? '').toLowerCase().includes('draft')) { score += 0.2; reasons.push('Artifact sportsbook hint points to DraftKings.'); }
  return { score: Math.min(score, 0.98), reasons };
}

function prizePicksSupports(context: ParserContext) {
  const joined = context.extraction.lines.map((line) => line.normalized).join(' ');
  let score = 0;
  const reasons: string[] = [];
  if (/prizepicks/.test(joined)) { score += 0.74; reasons.push('OCR text includes PrizePicks branding.'); }
  if (/flex play|power play/.test(joined)) { score += 0.16; reasons.push('PrizePicks play-mode text detected.'); }
  if ((context.source_sportsbook_hint ?? '').toLowerCase().includes('prize')) { score += 0.2; reasons.push('Artifact sportsbook hint points to PrizePicks.'); }
  return { score: Math.min(score, 0.98), reasons };
}

function baseSlipResult(context: ParserContext, adapter: ParserAdapterName, sportsbook: SportsbookName | null, selection: ParserSelection, raw: Record<string, unknown>, slip: ParsedSlipCandidate): ParserResult {
  const confidence = averageConfidence([selection.confidence, slip.confidence_score]);
  const warnings = [...slip.warnings];
  const parse_status: ParseStatus = slip.leg_count === 0 ? 'failed' : slip.warnings.some((warning) => warning.category === 'field_ambiguous' || warning.category === 'field_missing') ? 'partial' : 'parsed';
  const recommended_next_state: ParserRecommendedNextState = confidence != null && confidence >= 0.75 && parse_status === 'parsed' ? 'parsed_unverified' : 'needs_review';
  return {
    adapter: { name: adapter, version: '1.0.0' },
    classification: selection,
    state: parse_status === 'failed' ? 'failed' : parse_status === 'partial' ? 'partial' : 'parsed',
    parse_status,
    recommended_next_state,
    confidence_score: confidence,
    confidence_label: toConfidenceLabel(confidence),
    warnings,
    errors: parse_status === 'failed' ? [{ category: 'layout_unreadable', code: 'no_supported_leg_structure', message: 'No supported leg structure was detected for this adapter.', recoverable: true }] : [],
    provenance: { extraction_quality: context.extraction.quality, source_sportsbook_hint: context.source_sportsbook_hint ?? null, recognized_sportsbook: sportsbook, raw_text_line_count: context.extraction.lines.length, notes: selection.reasons },
    raw_adapter_output: raw,
    normalized: { slip, account_activity: null },
  };
}

function parseCommonSlipFields(context: ParserContext, sportsbook: SportsbookName, stakeHints: string[], payoutHints: string[]): Omit<ParsedSlipCandidate, 'sport' | 'league' | 'raw_source_reference' | 'confidence_score' | 'parse_quality' | 'leg_count' | 'legs' | 'warnings'> {
  const stakeLine = context.extraction.lines.find((line) => stakeHints.some((hint) => line.normalized.includes(hint)));
  const payoutLine = context.extraction.lines.find((line) => payoutHints.some((hint) => line.normalized.includes(hint)));
  const stakeParsed = stakeLine ? parseMoneyFromLine(stakeLine, 'stake', stakeHints) : { field: parserField<number | null>(null, null, null), warning: { category: 'field_missing', code: 'missing_stake', message: 'Stake row was not detected.', field: 'stake' } as ParserWarning };
  const payoutParsed = payoutLine ? parseMoneyFromLine(payoutLine, 'potential_payout', payoutHints) : { field: parserField<number | null>(null, null, null), warning: { category: 'field_missing', code: 'missing_potential_payout', message: 'Potential payout row was not detected.', field: 'potential_payout' } as ParserWarning };
  return {
    sportsbook: parserField(sportsbook, 0.95, null, 'inferred'),
    placed_at: parserField<string | null>(null, null, null),
    settled_at: parserField<string | null>(null, null, null),
    stake: stakeParsed.field,
    payout: parserField<number | null>(null, null, null),
    potential_payout: payoutParsed.field,
    odds: parseOdds(context.extraction.lines),
    status: deriveStatus(context.extraction.lines),
  };
}

function parseFanDuel(context: ParserContext, selection: ParserSelection): ParserResult {
  const warnings: ParserWarning[] = [];
  const base = parseCommonSlipFields(context, 'FanDuel', ['total bet'], ['to return']);
  const legs = context.extraction.lines.map(parseLegLine).filter((leg): leg is ParsedSlipLegCandidate => Boolean(leg));
  if (legs.length === 0) warnings.push({ category: 'layout_mismatch', code: 'fanduel_no_leg_match', message: 'FanDuel branding was found, but no leg rows matched the supported formats.' });
  const sportLine = context.extraction.lines.find((line) => /nba|nfl|mlb|nhl|wnba|soccer|ncaa/.test(line.normalized));
  const sport = sportLine ? titleCaseWords(sportLine.text.replace(/[^A-Za-z/ ]+/g, ' ').trim()) : null;
  const slip: ParsedSlipCandidate = {
    ...base,
    sport: parserField(sport, sport ? 0.52 : null, sportLine ? evidenceForLine(sportLine, 'Sport tag inferred from OCR line') : null, sport ? 'inferred' : 'missing'),
    league: parserField(sport, sport ? 0.48 : null, sportLine ? evidenceForLine(sportLine, 'League copied from detected sport tag') : null, sport ? 'inferred' : 'missing'),
    raw_source_reference: parserField<string | null>(context.extraction.raw_text || null, 0.95, null),
    confidence_score: averageConfidence([base.stake.confidence, base.potential_payout.confidence, base.odds.confidence, averageConfidence(legs.map((leg) => leg.confidence_score))]),
    parse_quality: legs.length > 0 ? (warnings.length > 0 ? 'partial' : 'parsed') : 'failed',
    leg_count: legs.length,
    legs,
    warnings: [...warnings, ...(base.stake.value == null ? [{ category: 'field_missing' as const, code: 'missing_stake', message: 'Stake could not be extracted.', field: 'stake' }] : []), ...(base.potential_payout.value == null ? [{ category: 'field_missing' as const, code: 'missing_potential_payout', message: 'Potential payout could not be extracted.', field: 'potential_payout' }] : [])],
  };
  return baseSlipResult(context, 'fanduel', 'FanDuel', selection, { sportsbook: 'FanDuel', matched_legs: legs.length }, slip);
}

function parseDraftKings(context: ParserContext, selection: ParserSelection): ParserResult {
  const warnings: ParserWarning[] = [];
  const base = parseCommonSlipFields(context, 'DraftKings', ['bet amount'], ['total payout', 'to win']);
  const legs = context.extraction.lines.map(parseLegLine).filter((leg): leg is ParsedSlipLegCandidate => Boolean(leg));
  if (legs.length === 0) warnings.push({ category: 'layout_mismatch', code: 'draftkings_no_leg_match', message: 'DraftKings branding was found, but supported leg rows were not detected.' });
  const slip: ParsedSlipCandidate = {
    ...base,
    sport: parserField<string | null>(null, null, null),
    league: parserField<string | null>(null, null, null),
    raw_source_reference: parserField<string | null>(context.extraction.raw_text || null, 0.95, null),
    confidence_score: averageConfidence([base.stake.confidence, base.potential_payout.confidence, base.odds.confidence, averageConfidence(legs.map((leg) => leg.confidence_score))]),
    parse_quality: legs.length > 0 ? (warnings.length > 0 ? 'partial' : 'parsed') : 'failed',
    leg_count: legs.length,
    legs,
    warnings: [...warnings],
  };
  return baseSlipResult(context, 'draftkings', 'DraftKings', selection, { sportsbook: 'DraftKings', matched_legs: legs.length }, slip);
}

function parsePrizePicks(context: ParserContext, selection: ParserSelection): ParserResult {
  const playLine = context.extraction.lines.find((line) => /flex play|power play/.test(line.normalized));
  const legs = context.extraction.lines.map(parseLegLine).filter((leg): leg is ParsedSlipLegCandidate => Boolean(leg)).map((leg) => ({ ...leg, odds: parserField<number | null>(null, null, null) }));
  const entryLine = context.extraction.lines.find((line) => /entry|wager|amount/.test(line.normalized));
  const payoutLine = context.extraction.lines.find((line) => /to win|payout|return/.test(line.normalized));
  const stake = entryLine ? parseMoneyFromLine(entryLine, 'stake', ['entry', 'wager', 'amount']).field : parserField<number | null>(null, null, null);
  const potentialPayout = payoutLine ? parseMoneyFromLine(payoutLine, 'potential_payout', ['to win', 'payout', 'return']).field : parserField<number | null>(null, null, null);
  const warnings: ParserWarning[] = [];
  if (legs.length === 0) warnings.push({ category: 'layout_mismatch', code: 'prizepicks_no_pick_match', message: 'PrizePicks branding was found, but supported pick rows were not detected.' });
  const slip: ParsedSlipCandidate = {
    sportsbook: parserField('PrizePicks', 0.95, null, 'inferred'),
    placed_at: parserField<string | null>(null, null, null),
    settled_at: parserField<string | null>(null, null, null),
    stake,
    payout: parserField<number | null>(null, null, null),
    potential_payout: potentialPayout,
    odds: parserField<number | null>(null, null, null),
    status: deriveStatus(context.extraction.lines),
    sport: parserField<string | null>(null, null, null),
    league: parserField<string | null>(null, null, null),
    raw_source_reference: parserField<string | null>(context.extraction.raw_text || null, 0.95, null),
    confidence_score: averageConfidence([stake.confidence, potentialPayout.confidence, averageConfidence(legs.map((leg) => leg.confidence_score))]),
    parse_quality: legs.length > 0 ? 'partial' : 'failed',
    leg_count: legs.length,
    legs,
    warnings: [playLine ? { category: 'field_missing', code: 'prizepicks_mode_detected', message: `Detected ${playLine.text}; payout still needs review because multiplier layouts vary.` } : { category: 'field_missing', code: 'prizepicks_mode_missing', message: 'PrizePicks entry mode was not confidently detected.' }, ...warnings],
  };
  return baseSlipResult(context, 'prizepicks', 'PrizePicks', selection, { sportsbook: 'PrizePicks', play_mode: playLine?.text ?? null, matched_legs: legs.length }, slip);
}

function parseGenericFallback(context: ParserContext, selection: ParserSelection): ParserResult {
  const legs = context.extraction.lines.map(parseLegLine).filter((leg): leg is ParsedSlipLegCandidate => Boolean(leg));
  const confidence = averageConfidence([0.35, averageConfidence(legs.map((leg) => leg.confidence_score))]);
  return {
    adapter: { name: 'generic_fallback', version: '1.0.0' },
    classification: selection,
    state: legs.length > 0 ? 'partial' : 'failed',
    parse_status: legs.length > 0 ? 'partial' : 'failed',
    recommended_next_state: legs.length > 0 ? 'needs_review' : 'parse_failed',
    confidence_score: confidence,
    confidence_label: toConfidenceLabel(confidence),
    warnings: [{ category: 'classification_weak', code: 'generic_fallback', message: 'No sportsbook-specific parser could be selected confidently. Generic candidate data needs review.' }],
    errors: legs.length > 0 ? [] : [{ category: 'adapter_selection_failed', code: 'no_adapter_match', message: 'No sportsbook-specific parser could be selected.', recoverable: true }],
    provenance: { extraction_quality: context.extraction.quality, source_sportsbook_hint: context.source_sportsbook_hint ?? null, recognized_sportsbook: null, raw_text_line_count: context.extraction.lines.length, notes: selection.reasons },
    raw_adapter_output: { matched_legs: legs.length },
    normalized: {
      slip: legs.length > 0 ? {
        sportsbook: parserField<string | null>(context.source_sportsbook_hint ?? null, context.source_sportsbook_hint ? 0.4 : null, null, context.source_sportsbook_hint ? 'inferred' : 'missing'),
        placed_at: parserField<string | null>(null, null, null),
        settled_at: parserField<string | null>(null, null, null),
        stake: parserField<number | null>(null, null, null),
        payout: parserField<number | null>(null, null, null),
        potential_payout: parserField<number | null>(null, null, null),
        odds: parseOdds(context.extraction.lines),
        status: deriveStatus(context.extraction.lines),
        sport: parserField<string | null>(null, null, null),
        league: parserField<string | null>(null, null, null),
        raw_source_reference: parserField<string | null>(context.extraction.raw_text || null, 0.95, null),
        confidence_score: confidence,
        parse_quality: 'partial',
        leg_count: legs.length,
        legs,
        warnings: [{ category: 'classification_weak', code: 'generic_unclassified_slip', message: 'Slip legs were extracted generically, but sportsbook classification stayed uncertain.' }],
      } : null,
      account_activity: null,
    },
  };
}

export const parserAdapters: BettorMemoryParserAdapter[] = [
  { name: 'fanduel', version: '1.0.0', supports: fanDuelSupports, parse: (context) => parseFanDuel(context, { adapter: 'fanduel', confidence: fanDuelSupports(context).score, reasons: fanDuelSupports(context).reasons, source_sportsbook_hint: context.source_sportsbook_hint ?? null }) },
  { name: 'draftkings', version: '1.0.0', supports: draftKingsSupports, parse: (context) => parseDraftKings(context, { adapter: 'draftkings', confidence: draftKingsSupports(context).score, reasons: draftKingsSupports(context).reasons, source_sportsbook_hint: context.source_sportsbook_hint ?? null }) },
  { name: 'prizepicks', version: '1.0.0', supports: prizePicksSupports, parse: (context) => parsePrizePicks(context, { adapter: 'prizepicks', confidence: prizePicksSupports(context).score, reasons: prizePicksSupports(context).reasons, source_sportsbook_hint: context.source_sportsbook_hint ?? null }) },
];

export function selectParserAdapter(context: ParserContext): ParserSelection {
  const candidates = parserAdapters.map((adapter) => ({ adapter: adapter.name, ...adapter.supports(context) })).sort((a, b) => b.score - a.score);
  const top = candidates[0];
  if (!top || top.score < 0.72) {
    return { adapter: 'generic_fallback', confidence: top?.score ?? 0, reasons: top ? [...top.reasons, 'Top classifier score stayed below the conservative adapter threshold.'] : ['No adapter signals were detected.'], source_sportsbook_hint: context.source_sportsbook_hint ?? null };
  }
  return { adapter: top.adapter, confidence: top.score, reasons: top.reasons, source_sportsbook_hint: context.source_sportsbook_hint ?? null };
}

export function runParser(context: ParserContext): ParserResult {
  if (context.extraction.quality === 'missing') {
    return {
      adapter: { name: 'generic_fallback', version: '1.0.0' },
      classification: { adapter: 'generic_fallback', confidence: 0, reasons: ['No OCR text was available.'], source_sportsbook_hint: context.source_sportsbook_hint ?? null },
      state: 'failed',
      parse_status: 'failed',
      recommended_next_state: 'parse_failed',
      confidence_score: null,
      confidence_label: 'unknown',
      warnings: [{ category: 'ocr_limited', code: 'missing_ocr_text', message: 'No OCR text was provided to the parser.' }],
      errors: [{ category: 'ocr_missing', code: 'missing_ocr', message: 'Parser adapters require OCR or text extraction input.', recoverable: true }],
      provenance: { extraction_quality: context.extraction.quality, source_sportsbook_hint: context.source_sportsbook_hint ?? null, recognized_sportsbook: null, raw_text_line_count: 0, notes: [] },
      raw_adapter_output: null,
      normalized: { slip: null, account_activity: null },
    };
  }
  const selection = selectParserAdapter(context);
  if (selection.adapter === 'generic_fallback') return parseGenericFallback(context, selection);
  const adapter = parserAdapters.find((item) => item.name === selection.adapter);
  return adapter ? adapter.parse(context) : parseGenericFallback(context, selection);
}

export function mapCandidateLegToRecord(candidate: ParsedSlipLegCandidate, slipId: string, verificationStatus: VerificationStatus): Omit<ParsedSlipLegRecord, 'leg_id'> {
  return {
    slip_id: slipId,
    player_name: candidate.player_name.value,
    team_name: candidate.team_name.value,
    market_type: candidate.market_type.value,
    line: candidate.line.value,
    over_under_or_side: candidate.over_under_or_side.value,
    odds: candidate.odds.value,
    result: candidate.result.value,
    event_descriptor: candidate.event_descriptor.value,
    sport: candidate.sport.value,
    league: candidate.league.value,
    confidence_score: candidate.confidence_score,
    verification_status: verificationStatus,
    normalized_market_label: candidate.normalized_market_label.value,
    data_source: 'parser_output',
    parse_snapshot_json: candidate as unknown as Record<string, unknown>,
    verified_snapshot_json: null,
    last_reviewed_at: null,
  };
}

export function mapCandidateSlipToRecord(candidate: ParsedSlipCandidate, bettorId: string, artifactId: string, verificationStatus: VerificationStatus): Omit<ParsedSlipRecord, 'slip_id' | 'created_at' | 'updated_at' | 'legs'> {
  return {
    bettor_id: bettorId,
    source_artifact_id: artifactId,
    sportsbook: candidate.sportsbook.value,
    placed_at: candidate.placed_at.value,
    settled_at: candidate.settled_at.value,
    stake: candidate.stake.value,
    payout: candidate.payout.value,
    potential_payout: candidate.potential_payout.value,
    odds: candidate.odds.value,
    status: candidate.status.value ?? 'unknown',
    leg_count: candidate.leg_count,
    sport: candidate.sport.value,
    league: candidate.league.value,
    confidence_score: candidate.confidence_score,
    parse_quality: candidate.parse_quality,
    verification_status: verificationStatus,
    data_source: 'parser_output',
    raw_source_reference: candidate.raw_source_reference.value,
    parse_snapshot_json: candidate as unknown as Record<string, unknown>,
    verified_snapshot_json: null,
    last_reviewed_at: null,
  };
}

export function mapCandidateActivityToRecord(candidate: ParsedAccountActivityCandidate, bettorId: string, artifactId: string, verificationStatus: VerificationStatus): Omit<AccountActivityImportRecord, 'activity_import_id' | 'created_at' | 'updated_at'> {
  return {
    bettor_id: bettorId,
    source_artifact_id: artifactId,
    source_sportsbook: candidate.source_sportsbook.value,
    beginning_balance: candidate.beginning_balance.value,
    end_balance: candidate.end_balance.value,
    deposited: candidate.deposited.value,
    played_staked: candidate.played_staked.value,
    won_returned: candidate.won_returned.value,
    withdrawn: candidate.withdrawn.value,
    rebated: candidate.rebated.value,
    promotions_awarded: candidate.promotions_awarded.value,
    promotions_played: candidate.promotions_played.value,
    promotions_expired: candidate.promotions_expired.value,
    bets_placed: candidate.bets_placed.value,
    bets_won: candidate.bets_won.value,
    activity_window_start: candidate.activity_window_start.value,
    activity_window_end: candidate.activity_window_end.value,
    verification_status: verificationStatus,
    parse_quality: candidate.parse_quality,
    confidence_score: candidate.confidence_score,
    data_source: 'parser_output',
    parse_snapshot_json: candidate as unknown as Record<string, unknown>,
    verified_snapshot_json: null,
    last_reviewed_at: null,
  };
}
