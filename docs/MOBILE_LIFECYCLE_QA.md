# Canonical Mobile Lifecycle QA

Target viewport: **390 × 844** (phone baseline).

This is the acceptance gate for the canonical ResearchBets journey:

`Build → Ticket X-Ray → Ticket Pulse → Review + Memory`

The goal is not pixel perfection. The goal is that the bettor can complete the whole decision loop on a phone without losing ticket identity, truth context, hierarchy, or the primary next action.

## Mobile product rule

Every stage must preserve this order:

1. the object/ticket,
2. the ResearchBets answer,
3. one dominant next action,
4. deeper detail only on demand.

On a 390 px viewport, supporting controls must not compete with the answer.

## Cross-stage acceptance checks

### Continuity

- The same `trace_id`, `slip_id`, and tracked-ticket identity survive route transitions where available.
- `nervous.toHref(...)` remains the navigation path for context-preserving product links.
- No stage silently creates a second ticket representation.

### Truth

- Requested mode is not presented as verified provider state.
- Live freshness, stale state, coverage, and last-verified time are shown only where backed by runtime evidence.
- Missing live fields remain unknown; synthetic zero/progress is not shown as provider truth.
- Demo records do not train bettor performance memory.

### Layout

- No horizontal page overflow at 390 px.
- No fixed desktop-width rail or panel is required to reach the primary action.
- Three-column metrics collapse before becoming unreadable.
- Dense analysis/detail surfaces are behind disclosure on mobile.
- Long player/market/matchup text can wrap or truncate without moving actions off-screen.

### Touch / action reachability

- Primary route actions are at least ~44 px tall on mobile.
- Disclosure summaries are comfortable touch targets.
- Destructive/reorder controls do not rely on tiny hit areas for the primary workflow.
- When two lifecycle actions appear together, they stack on narrow screens rather than compressing into ambiguous buttons.

### Readability

- Core body copy stays at a readable mobile size.
- The first useful answer is visible before optional diagnostics.
- Labels are short enough to scan; implementation vocabulary is not required to proceed.

## Stage checks

### Build / `/slip`

Pass conditions:

- Board and ticket become one vertical flow below desktop breakpoint.
- `Analyze ticket` remains the dominant action.
- `Track live` and `Copy legs` remain secondary.
- Ticket leg text does not force horizontal overflow.
- Threshold Advisor, construction math, and memory warnings remain optional disclosures.

Source-level finding:

- Main board/ticket grid already collapses below `lg`.
- Ticket action hierarchy is already one primary + two secondary actions.
- Reorder/remove controls remain a follow-up touch-target candidate for rendered-device QA.

### Ticket X-Ray / `/stress-test`

Pass conditions:

- Weakest structural point is visible before graph/deep analysis.
- Fragility/correlation/weakest-leg metrics stack cleanly.
- Visual dependency map does not block the first action.
- Deep analysis remains optional.

Source-level finding:

- `XRayBriefing` stacks its three metrics below `sm`.
- Dependency visualization and deeper workbench are progressively disclosed after the answer-first redesign.

### Ticket Pulse / `/pulse`

Pass conditions:

- “What changed since X-Ray?” remains the first question.
- Tracked-ticket metadata does not create a fixed-width side rail.
- Review outcome is reachable as a full-width primary action on narrow screens.
- Back-to-X-Ray and additional tools do not compete with Review.

Changes in this QA pass:

- mobile tracked-ticket metadata becomes a full-width block with a top divider; desktop keeps the side divider,
- primary/secondary lifecycle actions stack at mobile width,
- route/action touch targets use a minimum 44 px height,
- optional tool disclosure and tool links get mobile-sized touch targets,
- page-brand link gets a mobile-sized hit area.

### Review + Memory / `/review`

Pass conditions:

- First scan answers original pressure → actual breaker → thesis result.
- Unknown lineage remains explicit rather than inferred.
- One next-time guardrail dominates the learning output.
- Edge Profile and full postmortem history stay behind disclosure.
- “Use this on the next X-Ray” remains the dominant continuation action.

Source-level finding:

- Answer-first Review already moves historical/performance depth behind disclosure.
- Runtime-device validation is still required for long breaker labels, guardrail body text, and lineage cards.

## Runtime validation still required

Source review catches structural risks but does not replace an actual browser/device pass. Before calling mobile lifecycle QA complete, validate a populated ticket at 390 × 844 through all four stages and capture:

1. first useful answer position,
2. horizontal overflow,
3. primary-action visibility,
4. long-label wrapping/truncation,
5. disclosure usability,
6. route identity continuity,
7. live stale/error states in Pulse,
8. verified/unknown lineage states in Review.

## Completion rule

Do not mark mobile lifecycle QA complete because each page looks acceptable in isolation. It passes only when a single ticket can traverse the whole canonical loop on a phone without ambiguity, context loss, false certainty, or a hidden primary action.
