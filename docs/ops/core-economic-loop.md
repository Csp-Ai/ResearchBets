# Core Economic Loop Ops Runbook

## 5-minute QA script
1. Start app: `npm run dev`.
2. Open `/` and click **Continue Research**.
3. Confirm Research Snapshot appears with claims and place-bet CTA.
4. Click **Log this bet** and submit form.
5. Open `/pending-bets`, click **Settle** on one row.
6. Open `/dashboard` and verify ROI, win rate, confidence buckets, insights.

## Session / anon IDs
- `POST /api/anon/init` creates anonymous `userId` + `sessionId`.
- Browser stores session in `localStorage` (`rb.sessionId`).
- Existing session emits `RETURN_VISIT`; new session emits `SESSION_STARTED`.

## Idempotency
- `POST /api/bets` requires `idempotencyKey`.
- Duplicate key for same endpoint + user returns same response, avoiding duplicate rows.

## Demo seed mode
- `POST /api/researchSnapshot/start` accepts `seed`.
- Use `seed=demo-seed` for deterministic evidence hashes and confidence buckets.

## Known limitations and next upgrades
- Runtime persistence is in-memory (replace with Supabase tables in production).
- Snapshot execution uses sync two-stage emulation (`accepted` + same-request completion).
- Connectors are deterministic mocks; replace with real MCP/tool connectors.
- Add trace grading/evals and Agents SDK orchestration in next sprint.
