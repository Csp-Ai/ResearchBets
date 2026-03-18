# Product: ResearchBets

## Who this is for right now

The first 7 users are Chris and 6 friends who bet props together and want a repeatable process, not gambling theater.

## What these 7 users do

1. **Quick slate scan** on `/` to find playable spots.
2. **Build a slip** on `/slip` by adding a few legs.
3. **Stress-test** on `/stress-test` before placing.
4. **Monitor** in `/control?tab=live` while games run.
5. **Review wins/losses** in `/control?tab=review` with real pasted/uploaded ingestion by default, then run postmortem.

## Canonical user promise

ResearchBets should always:

- Show a usable board, even when providers fail (demo fallback).
- Keep draft/build flow fast and account-optional.
- Provide deterministic risk language (correlation, volatility, exposure).
- Explain weak points before placement.
- Turn settled slips into reviewable learning, not vibes.

## Bettor promises

1. **Clarity over hype** — every risk call has a concrete reason.
2. **Deterministic fallback** — no dead-end experience if live services are unavailable.
3. **Lifecycle continuity** — board → slip → stress-test → control stays connected.
4. **Process feedback loop** — postmortem always outputs “what failed” and “what to change.”
5. **Truthful review ingestion** — AFTER-stage review defaults to the real parse/extract path; demo review is labeled as sample-only fallback.
6. **Visible provenance** — review output tells bettors whether it came from pasted text, screenshot OCR, or the demo sample, plus parse status, confidence availability, and continuity ids.
7. **Manual recovery before postmortem** — when OCR/parse quality is weak, bettors can correct extracted text and rerun the real review instead of being quietly routed to demo.
8. **Useful attribution, not vibes** — review highlights the weakest leg, classifies a short list of deterministic cause tags, and explains the failure/success in bettor-facing language tied to the same continuity ids.
9. **Truthful pattern learning** — once enough real reviewed slips exist, Control Room can show repeated mistake patterns across prior postmortems without inventing history or using LLMs.

## AFTER-stage attribution engine

- `/api/postmortem` now produces a compact attribution payload with `weakest_leg`, `cause_tags`, `confidence_level`, and `summary_explanation`.
- The engine is deterministic: it uses canonical run output plus continuity metadata, never LLM calls.
- Cause tags stay intentionally tight (`line_too_aggressive`, `role_mismatch`, `blowout_minutes_risk`, `low_usage_player`, `efficiency_variance`, `correlated_legs`, `late_game_inactivity`, `injury_or_rotation_shift`) so bettors can compare reviews over time.
- Control Room review renders this in a compact weakest-leg card with chips and one short explanation.
- Future extensibility: an LLM can later summarize or personalize copy, but only after deterministic attribution is computed and preserved as the canonical layer.

## AFTER-stage bettor pattern summary

- Real reviewed slips with attribution are also normalized into a compact history record keyed by canonical `trace_id` / `slip_id`.
- The pattern summary model is deterministic and narrow:
  - `recurring_tags: [{ tag, count, percentage }]`
  - `common_failure_mode`
  - `sample_size`
  - `confidence_level`
  - `recommendation_summary`
  - `recent_examples`
- The first version intentionally stays conservative:
  - no summary is fabricated when there is no history,
  - demo reviews do not count toward bettor history,
  - fewer than 3 reviewed slips returns low-confidence / insufficient-history language,
  - one isolated miss does not become a “pattern.”
- Current repeated-pattern buckets are explainable and compact: aggressive lines, blowout-sensitive scoring, role/market mismatch, correlated same-script exposure, rotation-context misses, and high-variance stat chasing.
- UI tone stays neutral and bettor-facing: “Across 8 reviewed slips…” instead of mystical or overconfident coaching copy.
- Future extension path: replace the local adapter with durable storage, add more weakest-leg features, or add richer learning systems later, while keeping deterministic attribution and continuity-safe history as the canonical base layer.

## Positioning: not a tout product

ResearchBets is not “locks,” picks spam, or guaranteed outcomes.

It is a bettor operating system for decision quality:

- structured prep,
- explicit downside framing,
- and post-game process improvement.

## Upgrade path: guest to optional account

- **Guest mode first:** immediate use with local draft/run continuity.
- **Optional account later:** unlocks durable history, cross-device continuity, and richer personalization without changing the core flow.

## 2-minute demo script (hackathon-ready)

1. Open `/` and show a live/upcoming board card.
2. Add 2–3 props, then jump to `/slip`.
3. Show `SlipIntelBar` and call out correlation + volatility.
4. Click **Stress Test** to open `/stress-test` and show verdict.
5. Switch to `/control?tab=review`, upload a sample image, verify the OCR preview, optionally correct the text, then run postmortem.
6. Point out the provenance strip so users can see source type, parse status, confidence availability, and continuity ids.
7. End on “what failed / what to change next time” outputs.
