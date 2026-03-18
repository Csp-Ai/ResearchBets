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
