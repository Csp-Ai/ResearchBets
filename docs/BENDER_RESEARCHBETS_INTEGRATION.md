# Bender × ResearchBets: screenshot-first integration contract

Status: implementation in draft pull requests; NOT released.
Canonical authorities: `docs/CANONICAL_PRODUCT.md`, `docs/STRATEGY.md`, `docs/ARCHITECTURE.md`.

## Dependency map

| Capability | Authority and current reuse | Gap / intentionally not duplicated |
| --- | --- | --- |
| Bender navigation | Bender `site/index.html`, `site/research-bets/index.html` | Existing local parlay math not mounted in entry route |
| Screenshot OCR | ResearchBets `src/features/ingest/ocr/ocrClient.ts` (Tesseract), `app/(product)/ingest/IngestPageClient.tsx` | OCR is not layout-grounded, no authoritative sportsbook-specific image extractor |
| Text extraction | `app/api/slips/parseText/route.ts`, `src/core/track/slipParser.ts` | Parser-derived values require row-by-row human confirmation |
| Stored artifact review | `src/core/bettor-memory/{parser,service.server,review}.ts` | Original upload opt-in; not a verified wager or outcome |
| Draft identity and confirmed state | `src/core/slips/draftSlipStore.ts` | Canonical draft stores raw OCR, parser candidate, user-confirmed fields, status, same slip/trace identity |
| Ticket structural risk | `src/core/slips/slipIntelligence.ts`, `src/components/xray/XRayBriefing.tsx` | Do not create an independent Bender risk engine; structural scores are not probabilities |
| Lifecycle and routes | `src/core/nervous/routes.ts`, `src/core/track/fromDraftSlip.ts` | Bender's domain cannot safely share session or OCR state without future bridge |
| Historical memory | `src/core/bettor-memory/service.server.ts`, verification records | Proposed screenshot is not a wager; settled label is not proof of win |
| Odds/stats/injuries | `src/core/providers/registry.server.ts`, TheOddsAPI, SportsDataIO, `injuriesProvider.ts` | Provider coverage can be absent/demo; injury fallback not live news |

## Chosen integration

Bender owns three research destinations: Bitcoin, SPY, ResearchBets.
The Bender `/research-bets/` page directs to the canonical ResearchBets
`/ingest?entry=bender` route. This is a **branded cross-site handoff**.
No screenshot bytes, ticket payload, credentials or account data pass in URLs.

ResearchBets owns OCR, candidate correction, `DraftSlipStore`, canonical
`/stress-test` and tracking. No iframe or parallel betting engine. A
future server-side bridge requires an agreed identity/auth protocol, owner
authorization, signed transfers and real QA; it must not be inferred from
shared branding or similar paths.

## Review contract

1. Image input: local PNG/JPEG/WebP, at most four images, max 8 MiB each.
   Camera/HEIC support depends on the browser; HEIC needs conversion.
2. Local OCR creates an untrusted text representation. Original image preview
   remains local unless user expressly opts in to authenticated artifact upload.
3. `/api/slips/parseText` returns parser candidates with evidence hints.
   Missing/ambiguous fields are not automatically confirmed.
4. Users edit each candidate or add/remove rows, explicitly confirm each,
   and separately select proposed/placed/live/settled/unknown status.
5. `DraftSlipStore.ingestion` retains original OCR, initial candidates,
   confirmed normalized legs, ticket status, confirmation timestamp,
   and the optional saved-artifact reference. `slip_id` / `trace_id`
   persist when navigating to X-Ray. `fromDraftSlip` preserves entry source.
6. Reviewed draft analysis never by itself creates placed-bet history.
   Changes and outcomes require separate future lifecycle verification.
7. Data gaps, prices and provider coverage are never represented as live,
   verified or a calibrated probability merely because parsing succeeded.

## Security scope and limitations

The server signed-in upload route validates MIME/signatures, byte size and
dimensions, authenticates the owner, and uses a canonical filename. Upload
rate limiting is currently in-memory and may not be globally distributed.
Image decoding, media malware scanning, secure preview TTL validation,
and account-specific storage-policy penetration testing still require
independent review. Text parsing is bounded and rate limited.

## Ownership boundaries (engineering workflow)

- Product/architecture: Bender navigation, contract review and route governance.
- Ingest/OCR: image handling, parser candidate correction, fixtures.
- Market integrity: provider coverage and source timestamps; no demo as live.
- X-Ray: canonical structural engine, unknown correlation bugs, calibrated language.
- UI: phone-first review and readable primary action.
- QA/security/release: checks, real screenshots, privacy, mobile and explicit release go/no-go.

## Unmet release gates

- GitHub workflows, `npm run check`, `verify:landing`, `audit:journey`,
  full test suites must pass with verifiable logs.
- Real anonymized FanDuel/DraftKings/PrizePicks images and independently
  validated extraction metrics (precision/recall and leg completeness).
- Stale/offline provider and special combined-price acceptance cases.
- Accessibility and 390 × 844, narrower phones, real Safari walkthrough.
- Verification of private artifact access, storage policies, account ownership,
  and memory anti-promotion invariants.
- End-to-end Bender BTC/SPY regression and approval before production release.

Go/no-go: **NO-GO** until all release evidence is obtained.

## 2026-11-21 screenshot integrity hardening

- The canonical text parser now joins adjacent player-name / directional-market /
  American-odds rows, preserving both signed odds and explicit direction.
  Ticket-level NBA/NFL labels are only inherited when unambiguous; unobserved
  direction and thresholds require human selection.
- Multiple screenshots are OCR-read and parsed separately, with a source-image
  index retained for every candidate and tracked leg. Repeated candidate rows
  are flagged for manual reconciliation, not silently dropped.
- If a screenshot cannot be read, successful image text remains available but
  analysis requires the user to explicitly acknowledge and correct the
  incomplete capture.
- Sportsbook branding is an unverified OCR suggestion, preserved separately
  from the user's editable sportsbook selection.

### Independent synthetic-image OCR smoke evidence (not sportsbook accuracy)

Two **synthetic** 390 × 844 high-contrast mobile ticket images were generated
with known text (one FanDuel-style NBA ticket and one DraftKings-style NFL
ticket). Native Tesseract CLI 5.5 recovered **all 10 text rows in each**
(20/20 line-level rows). Heavy Gaussian blur (radius 3.8 px) produced no
usable text for either image. The app's browser Tesseract pipeline may differ
from the native CLI, so these results verify only an independent OCR baseline
and leg-layout feasibility. They do not establish production screenshot
accuracy or any predictive sports-model accuracy. No real sportsbook images
were used and no precise recall metric for real-world screenshots is claimed.

The automated UI and parser tests use controlled OCR responses and cover
split rows, multi-image provenance, repeated OCR rows and partial OCR failures.
Real anonymized sportsbook images and mobile-device testing remain release
gates.
