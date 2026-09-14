export type PlayerAvailabilitySeverity = 'blocked' | 'caution';

export type PlayerAvailability = {
  label: string;
  severity: PlayerAvailabilitySeverity;
  detail?: string;
  asOf?: string;
};

const BLOCKED_PATTERNS = [
  /\bout\b/i,
  /\bdoubtful\b/i,
  /\binactive\b/i,
  /\binjured reserve\b/i,
  /\breserve\/injured\b/i,
  /\bphysically unable to perform\b/i,
  /\bpup\b/i,
  /\bsuspended\b/i,
];

const CAUTION_PATTERNS = [
  /\bquestionable\b/i,
  /\bgame[- ]time decision\b/i,
  /\blimited\b/i,
  /\bday[- ]to[- ]day\b/i,
];

export function classifyPlayerAvailability(input: {
  status?: string | null;
  detail?: string | null;
  asOf?: string | null;
}): PlayerAvailability | null {
  const status = input.status?.trim() ?? '';
  const detail = input.detail?.trim() ?? '';
  const haystack = `${status} ${detail}`.trim();
  if (!haystack) return null;

  const severity: PlayerAvailabilitySeverity | null = BLOCKED_PATTERNS.some((pattern) => pattern.test(haystack))
    ? 'blocked'
    : CAUTION_PATTERNS.some((pattern) => pattern.test(haystack))
      ? 'caution'
      : null;

  if (!severity) return null;

  return {
    label: status || (severity === 'blocked' ? 'Unavailable' : 'Status concern'),
    severity,
    detail: detail || undefined,
    asOf: input.asOf ?? undefined,
  };
}

export const normalizePlayerKey = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[.']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
