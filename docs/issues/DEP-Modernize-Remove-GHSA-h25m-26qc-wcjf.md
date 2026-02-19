# Deps modernization to remove GHSA-h25m-26qc-wcjf allowlist

## Where it is allowlisted

- Policy file: `docs/security/audit-policy.json`
- Advisory entry id used by `scripts/audit-prod.mjs`: `1112653` (GHSA-h25m-26qc-wcjf)

## Why it matters

- GHSA-h25m-26qc-wcjf is a high-severity Next.js advisory affecting production dependency audit posture.
- Temporary allowlisting is an exception; lingering allowlists weaken supply-chain governance and should be removed quickly.

## Remediation checklist

- [ ] Identify dependency chain from `npm audit --omit=dev --json`.
- [ ] Upgrade top-level dependencies to eliminate the advisory without major breaking changes where possible.
- [ ] If major upgrades are required, scope a dedicated PR and test matrix.

## Definition of Done

- [ ] Allowlist entry for `1112653` removed from `docs/security/audit-policy.json`.
- [ ] `npm run audit:prod` passes with no blocking advisories.
- [ ] CI is green.
