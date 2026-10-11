# ResearchBets 1.0 — First bettor, trustworthy X-Ray

## The person we are serving

An everyday bettor has a 4–6 leg ticket in FanDuel or another sportsbook. They have a phone, limited time, and no interest in learning an AI architecture. They want to know **which part of the ticket is fragile, and why**—without being sold a lock or a made-up prediction.

The success criterion is not more screens, more legs, or a winning bet. It is a **correctly understood ticket**, one comprehensible structural insight, and a bettor who would voluntarily return.

## Canonical private-beta journey

/ingest (screenshot or pasted text) → editable selection review → explicit whole-ticket confirmation → /stress-test (structural X-Ray).

- **Screenshot:** OCR runs on-device; the image is **not** sent to /api/bettor-memory/upload as a prerequisite. The extracted text **is** sent to /api/slips/parseText when the user chooses to review.
- **Review:** display each parsed player, sport, market, threshold, direction, odds (optional), and matchup (optional). Users correct OCR and add missing legs before checking the confirmation box. Changing any field revokes confirmation.
- **Eligibility:** only NFL/NBA player props for this narrow import path. Unknown sport, market, participant, or invalid threshold stops submission until corrected. Missing odds and game are allowed **only with unknown evidence/coverage**—never invented prices or correlation.
- **Submit:** send the original extracted text and bettor-corrected legs to /api/slips/submit so ticket identity survives into X-Ray. Reviewed legs override uncorrected OCR fields for this submission. The server records bettor_reviewed, not an independently verified record.
- **X-Ray:** structural fragility and known dependencies are visible. Unknown matchups do not create phantom game edges. Numeric thresholds are not classified aggressive solely for being integers. The briefing does **not** assert a statistically validated chance of winning, real-time injury news, or confirmed bookmaker pricing.

**Privacy boundary:** the screenshot *image* stays local in this flow, but typed/recognized text is sent to APIs and may be persisted at submission. Explicit authenticated history-upload functionality elsewhere is separate; it should not be conflated with anonymous X-Ray.

**Language contract:** "Reviewed by bettor" = a person confirmed what they saw. "Verified provider data" requires an actual source, provenance, freshness, and entitlement. Never substitute one for the other.

## Regression and customer acceptance

| Check | Expected |
| --- | --- |
| New mobile user on 390×844 | One visible entry action and clear route to structured review |
| FanDuel split OCR rows | Correct names/markets/thresholds or explicit edit required |
| Playerless OVER 5.5 ASSISTS | Cannot silently pass as a real player |
| Unknown market or collegiate moneyline | Cannot silently become NBA points or NFL props |
| Missing odds | No fabricated bookmaker price; structural review may proceed |
| Missing matchup | Zero inferred same-game edges based solely on missing data |
| 4+ receptions, 2+ threes, 60+ receiving yards | No automatic "aggressive" flag from integer/larger line shape |
| Correction after checkbox | Checkbox resets; resubmit requires explicit confirmation |
| After confirm → X-Ray | Same trace_id, slip_id and reviewed leg values |
| X-Ray first glance | Main structural pressure, honest uncertainty, one next action |

Tester prompt: *"Open this link with a real ticket you already built. Without my help, upload or paste it, check the selections, and tell me what ResearchBets thinks is the main risk. What, if anything, felt wrong or confusing?"*

Capture completion, unrecognized selections, whether the user could explain the warning, time to useful read, and whether they would use it again. Never judge quality by ticket win rate alone.

## Intentionally not claimed as ready

- The baseline CI issue #316 remains a blocker until a runner actually executes the jobs.
- Next.js 14 must move to a supported patched line in a dedicated framework migration.
- Security/API authorization, rate limiting, upload policies, and retention/deletion need independent QA before general release.
- Live ticket update identity collisions and disappearing tickets (#341) keep Pulse outside this MVP release gate.
- Postgame causal diagnostics (#345) need verified evidence, not narrative guesswork.
- Real screenshot OCR accuracy, production latency, first-time visual clarity, accessibility, and actual returning bettors remain unmeasured until production-like mobile testing.

## Engineering philosophy

Keep **one ticket, one answer, one primary action**. Prefer removing user-facing noise to adding panels. A missed OCR field that asks for human correction is better than a convincing-looking false bet. Do not merge into main merely because the patch exists; the test and deployment gates must be observed passing.
