# NFL rollout

ResearchBets NFL support is being shipped incrementally so production stays stable.

## PR 310 — native NFL prop contract

- [x] Canonical NFL player-prop market types
- [x] Common football market aliases
- [x] NFL slip/free-text parsing
- [x] NFL labels across board and snapshot surfaces
- [x] The Odds API mappings for passing, rushing, receiving, receptions, carries, and anytime TD
- [x] Player-name extraction from provider descriptions
- [x] Focused unit coverage for NFL market mapping and parsing

## Next production slices

- [ ] Normalize NFL player game logs and current-season stats
- [ ] Resolve player IDs/names across odds and stats providers
- [ ] Add verified active/inactive/injury context
- [ ] Add sportsbook threshold/alternate-line lookup
- [ ] Add NFL-specific role, workload, volatility, and fragility signals
- [ ] Calibrate model confidence against settled NFL outcomes
- [ ] Validate LIVE/CACHE/DEMO provenance in the deployed NFL board

## Deployment gates

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. Vercel preview succeeds
5. Live provider credentials remain server-only
6. No demo/cache payload is presented as live

## Runtime note

Vercel has warned that Node.js 20.x becomes unsupported for new deployments on 2026-10-01. Move the Vercel project runtime to Node.js 24.x before that date and align CI after verifying the existing Next.js 14 application on Node 24.
