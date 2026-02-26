# Frontend Surface Audit: Decision Support vs Telemetry

## 1) Today surface (`TodayPageClient` + Board sections)

### Above-the-fold now
- League filter, refresh, freshness text, mode badge.
- Two-column game sections (Live/Upcoming) with add/analyze actions.
- Demo warning banner when fallback payload is active.

### Backend data not fully shown yet
- Provider error details and user-safe reason returned by today payload are not surfaced beyond generic demo copy.
- Provenance and rationale exist per prop but are compressed; no confidence or source quality compaction.
- Landing summary fields (`gamesCount`, `headlineMatchup`, `reason`) are underused for quick orientation.

### Telemetry over decision support smell
- Refresh/freshness mechanics are visible, but “What should I do next?” is implicit.
- Board lacks quick strongest/weakest candidate framing although underlying reasons already exist.

---

## 2) Slip surface (`SlipPageClient` + draft slip store + `SlipIntelBar`)

### Above-the-fold now
- Draft Slip header with board mode + locked context.
- Slip intelligence bar and board-derived add-leg UI.
- Draft list with remove/reorder/copy + analyze CTA.

### Backend data not fully shown yet
- No persistent `slip_id`/`trace_id` issuance shown despite available submit/extract APIs.
- No extraction insight preview (`leg_insights`) before moving to stress test.
- No event-backed parse status; user only sees local leg list.

### Telemetry over decision support smell
- Confidence/risk framing exists, but action recommendations (swap/remove candidates) are not explicit.
- Local store behavior dominates; bettor cannot easily resume on another device/session.

---

## 3) Stress Test surface (`ResearchPageContent` + `AnalyzeTabPanel` + demo run)

### Above-the-fold now
- Clear headline (“Find the weakest leg”), tab switcher, back links.
- Analyze tab renders verdict confidence, weakest leg, reasons, and rich drawer details.
- Recent activity and advanced/developer drawer available below fold.

### Backend data not fully shown yet
- Event timeline from `/api/events` not integrated into main analyze flow.
- Slip submission/extraction lifecycle states are hidden.
- Snapshot/recommendation contract can enrich “what to do next,” but mostly remains technical metadata.

### Telemetry over decision support smell
- Advanced drawer and provenance chips trend toward diagnostics.
- Bettor-critical workflow (“remove leg X or proceed”) still requires manual interpretation rather than guided actions.

---

## 4) Bettor-first blocks (`BettorFirstBlocks` + verdict surfaces)

### Above-the-fold now
- Verdict hero, confidence %, weakest leg callout, reason bullets.
- Activity panel + educational cards.

### Backend data not fully shown yet
- Could include stage status from events (submitted/extracted/enriched/verdict).
- Could include adaptive next actions using postmortem + historical outcomes.
- Could include mode-aware confidence adjustment explanation from pipeline verdict data.

### Telemetry over decision support smell
- Reasons are present, but conversion to concrete actions (swap candidate suggestions, hedge guidance) is thin.
- Trace/debug language leaks into bettor UX in places that should be plain “decision support”.

---

## Summary diagnosis
The frontend already renders rich cards and deterministic guardrails, but it underuses backend contracts for:
1. lifecycle clarity,
2. identity continuity (`slipId/trace_id`),
3. explicit next-step recommendations.
