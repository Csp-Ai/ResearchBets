export const GUARDRAILS_STORAGE_KEY = 'rb:guardrails:v1';

export type NextTimeRule = {
  key: 'assist_variance' | 'ladder_distance' | 'minutes_risk' | 'coverage_gap' | 'overleveraged';
  title: string;
  body: string;
  createdAt: string;
};

const RULE_MAP: Record<NextTimeRule['key'], Omit<NextTimeRule, 'key' | 'createdAt'>> = {
  assist_variance: { title: 'Cap high-variance legs to 1', body: 'Keep assists and similar high-variance markets limited to one leg per slip.' },
  ladder_distance: { title: 'Avoid thin ladders', body: 'Prefer lines near baseline usage and avoid long-distance ladder jumps.' },
  minutes_risk: { title: 'Avoid rotation-fragile props', body: 'Avoid legs that depend on unstable minutes or uncertain rotations.' },
  coverage_gap: { title: 'Avoid low-signal legs', body: 'Reduce exposure to legs with limited coverage or weak signal quality.' },
  overleveraged: { title: 'Reduce total leg count', body: 'Keep slips compact when uncertainty stacks across multiple legs.' }
};

export function mapMissTagsToNextTimeRule(tags: string[]): NextTimeRule | undefined {
  const normalized = tags.map((tag) => (tag === 'minutes_compression' ? 'minutes_risk' : tag === 'endgame_noise' ? 'overleveraged' : tag));
  const match = normalized.find((tag) => tag in RULE_MAP) as NextTimeRule['key'] | undefined;
  if (!match) return undefined;
  return { key: match, ...RULE_MAP[match], createdAt: new Date().toISOString() };
}

function readGuardrails(): NextTimeRule[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(GUARDRAILS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NextTimeRule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listGuardrails(): NextTimeRule[] {
  return readGuardrails();
}

export function saveGuardrail(rule: NextTimeRule): NextTimeRule[] {
  const deduped = [rule, ...readGuardrails().filter((item) => item.key !== rule.key)].slice(0, 10);
  if (typeof window !== 'undefined') window.localStorage.setItem(GUARDRAILS_STORAGE_KEY, JSON.stringify(deduped));
  return deduped;
}
