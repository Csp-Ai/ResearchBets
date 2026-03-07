import { describe, expect, it } from 'vitest';

import { buildTodayRuntimeSummary, getConfidenceCopy, getFreshnessCopy, getSourceQualityCopy, getTruthModeCopy } from '@/src/core/ui/truthPresentation';

describe('truthPresentation helpers', () => {
  it('returns neutral truthful copy for cache fallback', () => {
    const truth = getTruthModeCopy({ mode: 'cache', intentMode: 'live' });
    expect(truth.label).toBe('Cached board active');
    expect(truth.intentHint).toContain('Requested live');
  });

  it('caps confidence messaging when source quality is fallback-heavy', () => {
    const confidence = getConfidenceCopy({ confidencePct: 91, sourceQuality: 'fallback' });
    expect(confidence.boundedPct).toBe(65);
    expect(confidence.label).toContain('fallback-limited');
  });

  it('returns demo fallback source label in demo mode', () => {
    const quality = getSourceQualityCopy({ mode: 'demo', reason: 'provider_unavailable' });
    expect(quality.tier).toBe('fallback');
    expect(quality.label).toContain('demo fallback');
  });

  it('returns mixed source quality for cache/degraded runs', () => {
    const quality = getSourceQualityCopy({ mode: 'cache', degradedReason: 'Fallback provider data used.' });
    expect(quality.tier).toBe('mixed');
    expect(quality.label).toContain('mixed');
  });

  it('shows demo snapshot freshness in demo mode instead of large elapsed minutes', () => {
    const freshness = getFreshnessCopy({ mode: 'demo', generatedAt: '2020-01-01T00:00:00.000Z' });
    expect(freshness.label).toBe('Demo snapshot');
  });

  it('suppresses absurd stale elapsed strings when timestamp is outside freshness window', () => {
    const freshness = getFreshnessCopy({
      mode: 'live',
      generatedAt: '2020-01-01T00:00:00.000Z',
      nowMs: Date.parse('2026-01-15T00:00:00.000Z')
    });
    expect(freshness.label).toBe('Update time unavailable');
  });

  it('degrades gracefully when generatedAt is invalid in non-demo mode', () => {
    const freshness = getFreshnessCopy({ mode: 'cache', generatedAt: 'not-a-timestamp' });
    expect(freshness.label).toBe('Update time unavailable');
  });


  it('builds a singular runtime summary for degraded live responses', () => {
    const summary = buildTodayRuntimeSummary({
      mode: 'live',
      reason: 'provider_partial',
      degraded: true,
      degradedReason: 'Odds provider timed out',
      generatedAt: '2026-01-15T00:00:00.000Z',
      nowMs: Date.parse('2026-01-15T00:15:00.000Z')
    });

    expect(summary.modeLabel).toBe('Live board active (degraded)');
    expect(summary.sourceLabel).toBe('Source quality: mixed');
    expect(summary.freshnessLabel).toBe('15 min ago');
    expect(summary.fallbackDetail).toContain('Odds provider timed out');
  });


  it('deduplicates repeated fallback/runtime detail in banner copy', () => {
    const summary = buildTodayRuntimeSummary({
      mode: 'cache',
      reason: 'provider timed out',
      degradedReason: 'provider timed out'
    });

    expect(summary.bannerDetail).toContain('provider timed out');
    expect(summary.bannerDetail.match(/provider timed out/gi)?.length).toBe(1);
  });

  it('keeps verified live runtime summary free of fallback detail', () => {
    const summary = buildTodayRuntimeSummary({
      mode: 'live',
      reason: 'live_ok',
      generatedAt: '2026-01-15T00:00:00.000Z',
      nowMs: Date.parse('2026-01-15T00:02:00.000Z')
    });

    expect(summary.modeLabel).toBe('Live board active');
    expect(summary.sourceTier).toBe('verified');
    expect(summary.fallbackDetail).toBeUndefined();
  });

});
