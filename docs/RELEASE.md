# Release Checklist (v0.2.0+)

This checklist keeps canonical landing routing, neutral degradation messaging, and release gates aligned.

## Private 1.0 bettor X-Ray release gate (new)

This is a **no-go** until the checks below have **actually run**, not merely appeared in a repository test file.

- [ ] GitHub Actions runners execute jobs, and npm run check passes on the exact release SHA.
- [ ] Framework upgraded from the unsupported Next.js 14 line; a fresh production dependency/security scan has no unaddressed critical/high findings.
- [ ] At 390px viewport, a real screenshot is read locally without automatic image upload, and parsed selections can be corrected or added before submission.
- [ ] The user must explicitly confirm all player, league, market, line, direction, and available price/matchup fields. Unsupported or playerless OCR cannot proceed silently.
- [ ] A screenshot reviewed by a bettor remains parser-derived / reviewed, **not** provider-verified. Missing market context is labeled unknown.
- [ ] Regular integer lines get no arbitrary aggressive-threshold flag; unlabeled games produce no fictional same-game risk.
- [ ] The X-Ray is described as a **structural risk analysis**, not verified sportsbook odds, injury intelligence, or a win prediction.
- [ ] Two separate user sessions and authenticated storage permissions do not disclose one another's private uploads or event traces.
- [ ] Verify manual text and screenshot paths with at least 5 invited testers before enabling broader access.
- [ ] Verify the release candidate in its intended deployment with a real provider/degradation check; the production URL and configured mode are known.

**Out of scope for this gate:** live Pulse and postgame causal Review; they have their own blockers. See [FIRST_BETTOR_XRAY.md](FIRST_BETTOR_XRAY.md) and the October 2026 audit.



## 1) Local quality gates

```bash
npm ci
npm run check
```

Additional governance checks before release tagging:

```bash
npm run check:governor
```

## 2) Verify canonical routing (`/` shared with `/cockpit`, `/landing` -> `/`)

Run local dev (`npm run dev`) and confirm server redirects preserve query/spine context.

```bash
curl -I "http://localhost:3000/"
curl -I "http://localhost:3000/landing?sport=NBA&tz=America/Phoenix&date=2026-03-01&mode=demo&trace_id=trace_release"
```

Expected: `/` renders landing directly, and `/landing` responds with `Location: /?...` preserving incoming query parameters.

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
- `npm run check`
- `npm run check:governor`
- CI runs `npm run check` as the canonical web quality gate
- canonical log line at end of web quality job:

```text
Canonical entry: / (shared with /cockpit alias). Demo/cache expected when keys missing.
```

Do not print secrets or raw env values in CI logs.

## 6) Vercel deploy sanity checks

After deployment:
- Build completes with no fatal env-check errors in intended mode.
- Redirect behavior works in preview/prod (`/` renders landing, `/landing` routes to `/`).
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
