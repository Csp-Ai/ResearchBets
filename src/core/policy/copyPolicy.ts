export const BANNED_TOUT_PHRASES = [
  'lock',
  'guaranteed',
  'will hit',
  'free money',
  'can\'t lose',
  'sure thing',
  'risk free',
  'guaranteed win',
  'winning ticket',
  'no-brainer bet'
] as const;

export const ALLOWED_HEDGED_PATTERNS = [
  /not deterministic/i,
  /not (a )?pick/i,
  /for research (review|analysis)/i,
  /can be wrong/i,
  /may change/i,
  /probabilit(y|ies)/i,
  /confidence (is|remains)/i,
  /evidence(-| )first/i
] as const;

export type CopyPolicyViolation = {
  phrase: string;
  index: number;
};

export function findBannedCopyViolations(text: string): CopyPolicyViolation[] {
  const normalized = text.toLowerCase();
  return BANNED_TOUT_PHRASES.flatMap((phrase) => {
    const index = normalized.indexOf(phrase);
    return index >= 0 ? [{ phrase, index }] : [];
  });
}

export function hasAllowedHedging(text: string): boolean {
  return ALLOWED_HEDGED_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateCopyText(text: string): {
  compliant: boolean;
  violations: CopyPolicyViolation[];
  hedged: boolean;
} {
  const violations = findBannedCopyViolations(text);
  return {
    compliant: violations.length === 0,
    violations,
    hedged: hasAllowedHedging(text)
  };
}
