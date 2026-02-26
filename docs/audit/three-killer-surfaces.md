# Three Killer Surfaces (Minimal Backend Work)

## 1) BEFORE: Tonight’s Board → Scout Cards → Add to Slip

### Required data
- `GET /api/today` for games/scouts/mode/fallback reasons.
- `computeSlipIntelligence` (already in client-capable shared code) for current draft concentration context.
- Optional immediate submit ticket: `POST /api/slips/submit` on first “Analyze” click.

### Where it lives
- Route: `/today`
- Components: `TodayPageClient`, `GamesSection`, `TopSpotsPanel`

### Minimal contract additions
- Optional: include a lightweight per-scout `signalScore` in today payload (can also derive client-side initially).
- No required backend schema change for MVP.

### Interaction model
- Click scout card → quick action tray: **Add**, **Analyze now**, **View rationale**.
- “Analyze now” writes/ensures `slipId`, preserves spine, and transitions to `/stress-test?tab=analyze&slipId=...`.
- Inline weakest-leg prediction updates as user adds 2–4 legs.

### Acceptance criteria
- User can add a leg and reach analyze screen in ≤2 clicks.
- Mode badge and fallback reason are always visible and neutral.
- Board shows at least one actionable recommendation sentence per scout card.

---

## 2) DURING: Run Timeline / Trace Tracker (“Pizza Tracker”)

### Required data
- `POST /api/slips/submit`, `POST /api/slips/extract` results.
- `GET /api/events?trace_id=...` for event tape.
- Existing run data from `runStore` + verdict output from `runSlip`/`computeVerdict`.

### Where it lives
- Route: `/stress-test`
- Components: add tracker strip near header in `ResearchPageContent` / `AnalyzeTabPanel`

### Minimal contract additions
- Optional event normalization endpoint not required; can map event names client-side.
- Optional include `stage` field in emitted events for simpler grouping (nice-to-have only).

### Interaction model
- Tracker shows sequential stages: Submitted → Extracted → Enriched → Verdict.
- Clicking a stage opens concise details panel (time, notes, weak points, retry if failed).
- If a stage fails, CTA offers deterministic fallback explanation and next action.

### Acceptance criteria
- With valid trace, tracker renders within 1s and reflects latest stage.
- Failed extract state is visually distinct and provides a recovery action.
- User can identify current run status without opening developer/trace pages.

---

## 3) AFTER: Postmortem Card (What Broke + How to Adjust)

### Required data
- `POST /api/postmortem` (`legs`, `outcome`).
- Existing verdict + leg risk factors from run DTO.
- Optional historical context from `GET /api/history-bets`.

### Where it lives
- Route: `/control?tab=review` and secondary embed on `/stress-test` after run settles.
- Components: extend `ControlPageClient` review panel + shared `PostmortemCard`.

### Minimal contract additions
- Optional: add `adjustments` array from backend postmortem route (currently derivable client-side).
- No required backend changes for initial release.

### Interaction model
- User selects outcome (win/loss/push) and submits postmortem.
- Card returns 3 blocks: **What broke**, **confidence impact**, **what to change next time**.
- One-click actions: “save as rule”, “copy checklist”, “rerun without weakest leg”.

### Acceptance criteria
- Postmortem response shown in <1s for demo and normal modes.
- Card includes at least one concrete adjustment bullet tied to returned classification/intelligence.
- User can trigger rerun path directly from card without repasting slip.

---

## Why these 3
They complete the bettor loop using contracts already in repo, with highest leverage from existing endpoints and minimal net-new backend implementation.
