# ResearchBets Execution Plan

This is the active execution plan for moving ResearchBets from **Product Truth → Habit**. It is intentionally narrower than the total idea surface in the repository.

Use this document with:

- `docs/STRATEGY.md` for company strategy,
- `docs/CANONICAL_PRODUCT.md` for product/architecture authority,
- `config/convergence.json` for machine-readable canonical routes and owners.

When an attractive new feature conflicts with the current phase, this plan wins unless the strategy is deliberately revised.

## Current objective

Build the smallest complete ResearchBets experience that makes a new bettor understand the value within one session:

> **Research a thesis → express it with the right market and threshold → X-Ray the ticket → carry the thesis live → learn from settlement.**

The immediate 0→1 milestone is not “more features.” It is a coherent, fast, trustworthy loop that produces an obvious **aha**:

> **“This is not telling me what to bet. It is helping me understand the bet, improve the decision, and see what changed.”**

The Structural Risk Terminal remains the first sharp wedge. The execution plan should deepen that wedge by connecting research, market expression, live thesis health, and settlement learning rather than creating parallel products.

## Current baseline

Already established:

- canonical lifecycle: Discover/Build → X-Ray → Pulse → Review/Memory,
- company North Star: decision intelligence for parlays from idea to settlement, with Structural Risk Terminal preserved as the initial wedge,
- stable draft read/write behavior after recursion fix,
- live/cache/demo truth boundaries,
- Threshold Optimization v1 and build-time Threshold Advisor,
- `/stress-test` First Load JS reduced from roughly 342 kB to roughly 144 kB,
- `/slip` reference redesign around one ticket / one answer / one primary action,
- answer-first X-Ray direction,
- live polling resilience with stale/unknown behavior instead of fabricated progress,
- request timing/cache instrumentation for `/api/today` and `/api/ideas/today`,
- answer-first Pulse and Review/Memory surfaces,
- canonical mobile lifecycle QA gate,
- explicit intervention decision capture and verified settlement linkage,
- shared client ideas request deduplication and scan-phase timing,
- versioned canonical habit-loop telemetry for stage views, useful answers, and applied guardrails.

These are foundations, not the finish line.

## Product rule for every canonical screen

Each working screen should answer, in this order:

1. **What is happening?**
2. **What matters most?**
3. **Why?**
4. **What should I do next?**
5. **What deeper detail is available if I want it?**

Default surface hierarchy:

> **Object → ResearchBets answer → one next action → progressive disclosure**

Avoid multiple primary CTAs, duplicated representations of the same ticket, internal pipeline language, decorative complexity, or confidence language that outruns evidence.

The underlying model should preserve the bettor's decision context and ticket as a changing structural state across the lifecycle. Screens may simplify that state, but they should not independently reinvent it. Pregame and live-entry decisions must preserve what was already true when the decision was made.

## Workstream A — Complete the 1.0 lifecycle visually

### A1. Ticket Pulse — next

Goal: make live tracking answer-first rather than feed-first.

Primary view should show:

- current ticket pressure,
- strongest/carrying leg,
- weakest/pressured leg,
- what materially changed since pregame X-Ray,
- whether the original binding constraint strengthened, weakened, resolved, or was replaced by a new pressure,
- live-data freshness/coverage,
- one next action.

Keep detailed leg grids, diagnostics, and live machinery behind disclosure.

Acceptance gate:

- a user can understand the ticket's live state in under 10 seconds,
- stale/missing data is explicit,
- no synthetic zero is treated as live progress,
- pregame weakest-leg continuity is visible where identity/evidence supports it,
- observed live changes remain distinguishable from ResearchBets interpretation,
- one dominant action continues the lifecycle.

### A2. Ticket Review + Memory

Goal: make settlement feel like learning rather than a receipt.

Primary view should show:

- whether the original X-Ray pressure actually mattered,
- breaker leg / miss distance,
- whether a recommended threshold change would have changed ticket survival,
- whether the recommendation addressed the constraint it was intended to address even if another leg later failed,
- one bettor-memory lesson,
- one guardrail for next time.

Acceptance gate:

- reviewed outcomes distinguish verified, inferred, and unavailable evidence,
- no demo result trains performance memory,
- counterfactual language is factual and conditional rather than hindsight theater,
- recommendation evaluation is not reduced to final-ticket win/loss alone,
- the next-time guardrail can flow back into Build/X-Ray.

### A3. Discover / Build front door

Goal: make the first interaction lead toward X-Ray, not become a content destination.

Primary view should communicate:

- what ResearchBets does,
- today's usable market context,
- a fast path to build/paste a ticket,
- why X-Ray is the next step.

Acceptance gate:

- a first-time user can reach a meaningful X-Ray without learning internal product vocabulary,
- unavailable markets do not masquerade as expert rejection,
- near-miss or board recovery paths continue the journey rather than loop confusingly.

### A4. Mobile journey pass

Validate the complete canonical journey at approximately 390×844 before adding more desktop detail.

Required path:

`Build → X-Ray → Pulse → Review`

Check:

- first useful answer above unnecessary detail,
- no horizontal overflow,
- primary action reachable without hunting,
- progressive disclosures remain usable,
- ticket identity and structural thesis survive route transitions.

## Workstream B — Time to useful answer

The historical audit measured multi-second origin latency on the Today/Ideas path. The current system has instrumentation and warm caches; the next optimization must be driven by measured phase timing rather than guesswork.

Targets:

- warm useful state: **< 2 seconds**,
- no duplicate in-flight request for identical research context,
- no new ideas request solely because a ticket threshold changed,
- stale verified data can remain visible while a refresh occurs,
- secondary enrichment must not block the first useful answer unless it is required for truth or a safety guardrail.

Likely cold-path work after measurement:

- instrument events fetch vs per-event odds vs injuries vs recent form,
- replace serial per-event odds requests with bounded concurrency if that segment dominates,
- defer nonessential enrichment where the first answer can remain truthful without it,
- preserve fail-closed escalation rules when recent-form/market evidence is unavailable.

Do not publicly CDN-cache response objects that contain request-specific identity merely to chase latency. Cache generic provider/slate data below the identity-bearing response layer.

## Workstream C — Build the longitudinal data moat

ResearchBets must begin storing the decisions around the recommendation, not just the final ticket. Capture enough decision-time lineage now to support future calibration and state-transition analysis, but do not build a self-modifying system in the current phase.

### C1. Intervention event contract

For each actionable recommendation, capture enough structure to later answer whether it helped, what ResearchBets knew when it acted, and what structural constraint the intervention was intended to change:

- ticket / trace identity,
- stage,
- recommendation type,
- affected leg,
- identified primary pressure / target constraint,
- before threshold/price,
- recommended threshold/price,
- relevant before-state dimensions or structured risk context where available,
- evidence/provenance available at decision time,
- freshness/availability state for evidence required by the recommendation,
- source/provider identifiers where available and appropriate,
- analysis/recommendation/policy version,
- recommendation strength/confidence representation as actually shown or applied,
- recommendation timestamp,
- bettor accepted / rejected / ignored / unknown,
- resulting submitted/tracked ticket state where known,
- entry context: pregame vs live, event clock/period where available, and current stat state at the moment a live threshold was considered or accepted,
- verified opportunity context at decision time where supported (for example targets, carries, or pass attempts).

Do not infer acceptance when it cannot be verified. Preserve the decision-time snapshot rather than reconstructing it later from settlement-time data. A live 150+ threshold entered after 89 yards have already been produced must never be evaluated as though 150+ was selected pregame. Do not require a giant state vector before shipping the event contract; preserve enough structured context that future versions can evaluate the intended constraint without relying on prose alone.

### C2. Settlement + counterfactual

After settlement, derive conservative counterfactuals such as:

- original ticket survival,
- recommended-ticket survival if the exact alternative was known and settlement data supports it,
- breaker leg,
- miss distance,
- whether the intervention would have preserved the remaining ticket,
- whether the targeted structural pressure was actually reduced even if another independent failure occurred.

Store counterfactual methodology/version so later analysis is reproducible.

### C3. Memory feedback

Only reviewed/eligible records should influence personalized guardrails. Feed repeated evidence-backed patterns back into Build and X-Ray as concise warnings, not another analytics dashboard.

Favor within-bettor evidence such as repeated threshold aggression, recurring market-type fragility, repeated late-leg additions, or intervention patterns that helped this bettor under comparable conditions. Do not convert sparse behavior into broad personality claims.

### C4. Future system-calibration eligibility

Do not build adaptive source weighting or autonomous policy updates yet. Instead, make eligible records distinguish enough context that later offline evaluation can answer:

- whether a structural warning was calibrated or noisy,
- whether ResearchBets missed a recurring failure mode,
- whether an abstention or `unknown` state was appropriate,
- whether recommendation quality varies by evidence source, provider state, freshness, market type, sport, or policy version,
- whether aggregate scores masked severe constraints,
- whether candidate policy changes improve held-out eligible outcomes without weakening truth guardrails.

Calibration datasets must exclude demo/synthetic records and preserve uncertainty. Any later policy/source-weight change must be versioned, tested, reviewed, and deliberately promoted rather than silently learned into production.

## Workstream D — Prove habit before broad monetization

Instrument the canonical loop so we can answer whether users return because ResearchBets changed how they think about tickets.

Early metrics:

- first useful answer time,
- Build → X-Ray conversion,
- 7-day X-Ray repeat rate,
- recommendation interaction rate,
- recommendation acceptance rate where observable,
- X-Ray → Pulse continuation,
- Pulse → reviewed settlement completion,
- verified-memory depth per active bettor.

Do not optimize MAU, feed engagement, or session length at the expense of the decision loop.

## Workstream E — Proof before scale

Only after enough eligible data exists should ResearchBets evaluate intervention effectiveness and system calibration.

Questions to answer:

- Which intervention types are most often accepted?
- Which warnings are calibrated versus noisy?
- What are false-alarm and missed-warning rates for eligible warning classes?
- When ResearchBets withheld a strong recommendation because evidence was insufficient, was that abstention appropriately cautious?
- Do threshold reductions preserve more tickets in comparable contexts?
- When selective escalation is recommended, does the added risk remain within the intended guardrail?
- Does personalized memory reduce recurrence of the same construction mistake?
- Do particular evidence sources, freshness states, or provider paths correlate with materially different downstream recommendation quality?
- Do severe structural constraints predict failure better than undifferentiated aggregate scores?
- Did an intervention improve the intended ticket dimension even when the final parlay still lost for another reason?
- Do proposed policy changes improve held-out eligible records before they are considered for production?

Any public performance claim must state sample, eligibility, methodology, and uncertainty. ResearchBets should never imply guaranteed winnings.

## Explicitly deferred

Until the canonical loop proves habit, deprioritize:

- social/community expansion,
- contests and leaderboards,
- generalized sports-news surfaces,
- fantasy-product expansion,
- autonomous wagering,
- autonomous self-modification of recommendation policy or source weights,
- visible agent-governance/AI-ops dashboards,
- broad creator/tout marketplace features,
- large new sport matrices before the core flow works deeply in the current sport,
- cosmetic dashboard metrics without a decision consequence,
- exposed multidimensional ticket dashboards that add complexity without changing the decision,
- monetization mechanics that create pressure to increase betting volume.

Legacy code can remain as context, but deferred concepts should not regain canonical navigation or ownership accidentally.

## Engineering execution protocol

Use this protocol for ongoing implementation:

1. **Start from latest `main`.** One focused branch per measurable product or platform objective.
2. **Protect authority.** Do not create a new source of truth when a canonical owner already exists.
3. **Prefer subtraction.** Before adding a panel, ask whether an existing panel can answer the question more clearly.
4. **Instrument before optimizing.** For latency or reliability work, measure the largest segment before changing architecture.
5. **Preserve truth.** Live/cache/demo/stale/unknown distinctions survive every UI simplification.
6. **Fail closed.** Threshold escalation or strong recommendations require the evidence defined by their guardrails.
7. **Validate exact head on Vercel.** GitHub Actions runner failures that occur before steps are not treated as release proof or code failure; exact-head Vercel is the practical release gate while that infrastructure issue persists.
8. **No merge before green deployment.** Review route-size and First Load JS output for accidental regressions.
9. **Keep PRs explainable.** Each PR should state the user problem, strategic mapping, acceptance criteria, and what remains intentionally out of scope.
10. **Update authority docs when strategy changes.** Do not let chat decisions become invisible product policy.
11. **Version judgment changes.** Any future change to recommendation policy, calibration thresholds, or source weighting must be explicit, reproducible, testable, and reviewable.
12. **Keep observation separate from interpretation.** New data contracts and UI simplifications must not erase whether a claim was observed, derived, inferred, or speculative.

## Immediate execution queue

Unless a build failure or production-truth issue interrupts it, execute in this order:

1. **Private-user validation** across real end-to-end ticket lifecycles — research → construction → X-Ray → live → review — including both winning and losing outcomes, focused on comprehension, trust, recommendation usefulness, and voluntary repeat X-Ray usage.
2. **Habit readout** from the canonical lifecycle events: Build → X-Ray, X-Ray → Pulse, Pulse → Review, applied recommendations/guardrails, first useful answer time, and 7-day repeat X-Ray.
3. **Measure production time-to-data** using the timing/cache headers already added; optimize only the measured cold bottleneck.
4. **Durable lifecycle continuity** for tracked tickets, original thesis, interventions, settlement, and saved guardrails beyond one browser-local session.
5. **Evidence-led front-door refinement** based on observed private-user friction rather than another speculative redesign.
6. **Restore GitHub Actions runner execution** so repository CI executes real steps again; keep exact-head Vercel green as the release gate until then.

## 0→1 completion gate

ResearchBets has reached a credible 0→1 product when all of the following are true:

- a new user can understand the product in one session,
- one ticket identity survives Build → X-Ray → Pulse → Review,
- the original thesis, market expression, and primary structural pressure can be followed through the lifecycle where evidence supports them,
- every stage has one obvious primary answer/action,
- warm useful data is consistently fast,
- live/cache/demo/stale/unknown states are truthful,
- observed facts remain distinguishable from inference,
- the system captures recommendation decisions, target constraints, pregame/live entry context, decision-time lineage, and eligible outcomes,
- reviewed outcomes can generate a next-time guardrail,
- users voluntarily return to X-Ray another ticket,
- and the product feels simpler as its intelligence becomes more sophisticated.

That is the gate before treating ResearchBets as a 1→100 scaling problem.
