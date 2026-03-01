export function toBettorReason(reason?: string): string {
  if (!reason) return 'System is warming up.';
  if (reason === 'provider_unavailable') return 'Live feeds are temporarily unavailable.';
  if (reason === 'missing_keys') return 'Live feeds are not connected yet.';
  if (reason === 'strict_live_empty') return 'Live feeds returned no active board right now.';
  if (reason === 'cache_hit' || reason === 'cache_fallback') return 'Using cached slate.';
  return 'System is warming up.';
}

export function toBettorEventLabel(eventName: string): string {
  const map: Record<string, string> = {
    slip_submitted: 'Submitted',
    slip_extracted: 'Extracting',
    slip_enrich_started: 'Enriching started',
    slip_enrich_done: 'Enriching complete',
    slip_scored: 'Scoring',
    slip_verdict_ready: 'Verdict ready',
    slip_persisted: 'Saved',
    slip_extract_failed: 'Parsing issue detected',
  };
  return map[eventName] ?? 'Run update';
}
