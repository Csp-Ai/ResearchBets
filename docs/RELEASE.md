# Release Checklist (v0.2.0+)

This checklist keeps cockpit-first routing, neutral degradation messaging, and release gates aligned.

## 1) Local quality gates

```bash
npm ci
npm test
npm run build
```

Optional but recommended before release tagging:

```bash
npm run lint
npm run typecheck
npm run check:governor
```

## 2) Verify canonical redirects (`/` and `/landing` -> `/cockpit`)

Run local dev (`npm run dev`) and confirm server redirects preserve query/spine context.

```bash
curl -I "http://localhost:3000/"
curl -I "http://localhost:3000/landing?sport=NBA&tz=America/Phoenix&date=2026-03-01&mode=demo&trace_id=trace_release"
```

Expected: `Location` points at `/cockpit?...` with the incoming parameters preserved and normalized defaults applied when omitted.

## 3) Verify env-check behavior (demo vs strict)

```bash
npm run env:check
npm run env:check:strict
```

Expectations:
- Relaxed (`env:check`) allows local demo/cache workflows with warnings.
- Strict (`env:check:strict`) fails when required production/live keys are missing.
- Copy should remain cockpit-directed and neutral about degradation.

## 4) Verify provider warning policy

- Missing live provider keys should produce consolidated, neutral warnings (not noisy repeats).
- `/api/today` must still degrade cleanly with mode labels (`demo`, `cache`, `live`) and optional reasons.
- Build and test logs should not fail solely due to missing optional provider keys.

## 5) CI / GitHub Actions release gates

Confirm PR + `main` workflows run:
- `npm run test`
- `npm run build`
- lint/typecheck/governor gates
- canonical log line at end of web quality job:

```text
Canonical entry: / → /cockpit (server redirect). Demo/cache expected when keys missing.
```

Do not print secrets or raw env values in CI logs.

## 6) Vercel deploy sanity checks

After deployment:
- Build completes with no fatal env-check errors in intended mode.
- Redirect behavior works in preview/prod (`/` and `/landing` route to `/cockpit`).
- Route table includes app routes while runtime redirect behavior remains canonical.
- No regressions in cockpit page render, board fetch, and slip handoff.

## 7) Persistent npm warning: `Unknown env config "http-proxy"`

If this warning appears and repository search shows no repo-local config source, it is usually machine-level npm configuration.

Safe local cleanup:

```bash
npm config delete http-proxy
npm config delete proxy
npm config delete https-proxy
```

Then re-run `npm ci`/`npm run build`.

Notes:
- Do not add a repo-level `.npmrc` for this warning unless a repository-controlled config source is identified.
- Do not commit user-specific proxy values.
