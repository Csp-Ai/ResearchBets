# ResearchBets Audit Pack (Bettor Loop + Visualization Plan)

This folder is an execution-planning audit, not a feature implementation.

## Files
- `bettor-loop-map.md`: route-by-route loop map with state/dependency diagnosis.
- `backend-visualization-inventory.md`: backend contracts already available for immediate UI surfaces.
- `spine-contract-and-drift.md`: canonical URL/state contract and drift remediation plan.
- `frontend-surface-audit.md`: component-level audit of what is shown vs what is missing.
- `three-killer-surfaces.md`: 3 high-leverage visualizations (BEFORE, DURING, AFTER).
- `prioritized-backlog.md`: proposed next 10 PRs with risk and verification.
- `hygiene-and-deadweight.md`: deadweight and duplication report (no refactor yet).

## How to use this audit
1. Start with `spine-contract-and-drift.md` and backlog items #1–#3 to lock contract continuity.
2. Implement the DURING tracker (backlog #4) to make run state legible to bettors.
3. Ship BEFORE and AFTER improvements in parallel once identity continuity is stable.
4. Keep demo/live labels neutral and explicit in every user-facing phase.

## Validation run status
- `npm run lint`: pass.
- `npm run typecheck`: pass.

If either command fails in CI/local, document exact failure output in this README and resolve only trivial issues directly caused by audit doc updates (expected none).
