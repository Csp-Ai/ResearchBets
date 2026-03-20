import { describe, expect, it } from 'vitest';

import { buildTextExtraction, runParser, selectParserAdapter } from '../parser';
import type { ArtifactType } from '../types';

function context(rawText: string, artifactType: ArtifactType = 'slip_screenshot', sourceSportsbookHint?: string | null) {
  return { artifact_type: artifactType, source_sportsbook_hint: sourceSportsbookHint ?? null, extraction: buildTextExtraction(rawText) };
}

describe('bettor memory parser adapters', () => {
  it('selects FanDuel conservatively when branding and labeled rows are present', () => {
    const selection = selectParserAdapter(context([
      'FanDuel Sportsbook',
      'Same Game Parlay',
      'Jayson Tatum over 29.5 points (-110)',
      'Luka Doncic over 8.5 assists (-120)',
      'Total Bet $25.00',
      'To Return $62.50',
      '+150',
    ].join('\n')));
    expect(selection.adapter).toBe('fanduel');
    expect(selection.confidence).toBeGreaterThanOrEqual(0.72);
  });

  it('falls back to generic parsing when sportsbook classification is weak', () => {
    const result = runParser(context('Jayson Tatum over 29.5 points (-110)\nLuka Doncic over 8.5 assists (-120)'));
    expect(result.adapter.name).toBe('generic_fallback');
    expect(result.recommended_next_state).toBe('needs_review');
    expect(result.normalized.slip?.leg_count).toBe(2);
  });

  it('extracts conservative FanDuel candidate slip data with field-level confidence', () => {
    const result = runParser(context([
      'FanDuel Sportsbook',
      'NBA',
      'Jayson Tatum over 29.5 points (-110)',
      'Luka Doncic over 8.5 assists (-120)',
      'Total Bet $25.00',
      'To Return $62.50',
      '+150',
    ].join('\n')));
    expect(result.adapter.name).toBe('fanduel');
    expect(result.parse_status).toBe('parsed');
    expect(result.normalized.slip?.stake.value).toBe(25);
    expect(result.normalized.slip?.potential_payout.value).toBe(62.5);
    expect(result.normalized.slip?.legs[0]?.player_name.confidence).toBeGreaterThan(0.7);
    expect(result.normalized.slip?.legs[0]?.market_type.value).toBe('Points');
  });

  it('marks missing OCR text as a recoverable parse failure', () => {
    const result = runParser(context(''));
    expect(result.parse_status).toBe('failed');
    expect(result.errors[0]?.category).toBe('ocr_missing');
    expect(result.recommended_next_state).toBe('parse_failed');
  });
});
