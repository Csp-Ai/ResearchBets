# ResearchBets Canonical Product

This document is the product and architecture decision record for convergence. When an older audit, route map, UI variant, or implementation note conflicts with this file and `config/convergence.json`, this document wins.

Company strategy lives in `docs/STRATEGY.md`. Active sequencing and acceptance gates live in `docs/EXECUTION_PLAN.md`. Those files may explain **why** and **what next**, but this document remains the authority for the canonical product shape and architectural ownership.

## North Star

**ResearchBets is a Structural Risk Terminal for parlays — not a picks service.**

At the company level, ResearchBets is building the decision layer between a bettor and a sportsbook. A sportsbook answers what can be bet; ResearchBets should explain what a ticket depends on, where it is fragile, what would improve it, how that thesis changes live, and what should be learned after settlement.

It helps a bettor discover candidates, construct a ticket, identify structural failure risk, follow the same ticket live, and learn from settlement. It does not promise winners or manufacture certainty.

## Canonical lifecycle

| Stage            | Product name            | Canonical route | Primary question                                                  |
| ---------------- | ----------------------- | --------------- | ----------------------------------------------------------------- |
| Discover + Build | ResearchBets Home       | `/`             | What is worth investigating, and what belongs together?           |
| Before           | Ticket X-Ray            | `/stress-test`  | What is most likely to break this ticket before lock?             |
| During           | Ticket Pulse            | `/pulse`        | What is carrying the ticket, and what is under verified pressure? |
| After            | Ticket Autopsy + Memory | `/review`       | Why did it break or hold, and what should change next time?       |

`/ingest`, `/slip`, and `/today` remain supported as alternate or expanded entry surfaces while their unique capabilities are folded into the canonical lifecycle. Compatibility and internal routes are listed in `config/convergence.json`.

The desired bettor habit is simple: **before you place the parlay, X-Ray it.** The lifecycle exists to make that habit more useful over time by preserving the same ticket thesis through live tracking and settlement.

## Canonical experience rule

Every canonical working screen should present information in this order:

1. the ticket or object being acted on,
2. the ResearchBets answer,
3. one dominant next action,
4. deeper detail on demand.

The product should answer, as directly as possible:

- What is happening?
- What matters most?
- Why?
- What should I do next?

The intelligence should feel deeper than the interface. Internal pipeline state, duplicate editors, decorative analysis machinery, or multiple competing CTAs should not dominate the first screen.

## Core product engines

The canonical product converges around four engines:

1. **Market Truth Layer** — events, participants, markets, alternate thresholds, prices, freshness, and live/cache/demo/unavailable provenance.
2. **Structural Risk Engine** — weakest-leg pressure, threshold aggressiveness, dependencies, correlation, concentrated exposure, fragility, volatility, and failure modes.
3. **Decision Engine** — turns evidence into hold / step down / selectively escalate / remove / replace / gather-more-evidence actions.
4. **Bettor Memory** — uses eligible reviewed outcomes to surface repeated bettor-specific patterns and next-time guardrails.

These engines may have separate implementations, but the user should experience them as one continuous decision system.

## Dynamic ticket-state model

The canonical product treats the ticket as a **time-varying structural state**, not as a single opaque score.

Conceptually, the system may reason across dimensions such as threshold pressure, dependency/correlation, game-script exposure, market truth/freshness, roster uncertainty, price structure, concentration, volatility, and evidence strength. The exact internal representation may evolve, but the following rules are canonical:

- aggregate scores are summaries, not authorities;
- a severe structural constraint may dominate the recommendation even when average component quality looks acceptable;
- X-Ray, Pulse, and Autopsy must preserve continuity of the same ticket state and thesis rather than generate unrelated analyses;
- state transitions should distinguish what changed in the world from what changed only in ResearchBets interpretation;
- interventions should preserve before-state, proposed change, and resulting state when observable;
- verified observations, derived measurements, inferences, and speculation must remain distinguishable in the data model and presentation policy;
- bettor-specific learning should be based on repeated eligible within-bettor patterns rather than broad personality inference.

The bettor should not have to inspect this state model directly. The UI should compress it into the primary pressure, supporting evidence, and one next action.

## Cross-cutting calibration layer

The four engines may be evaluated by a shared internal calibration capability, but calibration is **not** a fifth user-facing engine and must not create another competing product surface.

Its purpose is to make later answers auditable and improvable by preserving and evaluating:

- decision-time evidence and provenance,
- freshness and availability state,
- provider/source lineage where available,
- analysis/recommendation/policy version,
- recommendation strength and action class,
- bettor response where observable,
- settlement and reproducible counterfactual eligibility,
- later evaluation of warning, abstention, and recommendation quality.

Calibration may produce metrics, experiments, or candidate policy changes. It may not silently change production source weights, thresholds, recommendation policy, or confidence language. Material changes to product judgment require an explicit versioned implementation, tests, review, and deliberate promotion.

The user should experience the benefits as better calibrated answers, not as an exposed agent hierarchy or self-governance console.

## One source of truth means one owner per concern

| Concern                  | Authority                              | Rule                                                                                              |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Query/navigation context | `src/core/nervous/spine.ts`            | All route context normalizes to `QuerySpine`. Other spine shapes are adapters only.               |
| Context-preserving links | `src/core/nervous/routes.ts`           | Product navigation uses `nervous.toHref(...)`; manual query construction is not canonical.        |
| Lifecycle identity       | `src/core/lineage/lineage.ts`          | `trace_id`, `run_id`, `slip_id`, and `ticketId` relationships normalize here.                     |
| Draft ticket state       | `src/core/slips/draftSlipStore.ts`     | The active browser draft and its early identity originate here.                                   |
| Analysis output          | `src/core/run/researchRunDTO.ts`       | UI consumes the canonical analysis read model rather than inventing page-specific verdict shapes. |
| Analysis execution       | `src/core/pipeline/runSlip.ts`         | Submit, extraction, enrichment, scoring, and verdict orchestration converge here.                 |
| Durable server state     | `src/core/persistence/runtimeStore.ts` | Server persistence goes through `RuntimeStore`; Supabase and memory are implementations.          |
| Tracked ticket state     | `src/core/track/store.ts`              | During-stage browser continuity uses the tracked-ticket contract until durable sync replaces it.  |
| Slate truth              | `src/core/today/service.server.ts`     | Board consumers adapt the same live/cache/demo payload.                                           |
| Truth language           | `src/core/ui/truthPresentation.ts`     | Live, cache, demo, degraded, and unavailable language comes from one presentation policy.         |

This does **not** require one physical database or one enormous type. Browser draft state and durable server state have different responsibilities. They must share identity and contracts, not pretend to be the same storage mechanism.

## Non-negotiable invariants

1. Live, cache, demo, parsed, inferred, verified, stale, and unknown states remain distinguishable where relevant.
2. No synthetic progress appears as live progress.
3. Demo artifacts do not train bettor memory, system calibration, or performance claims.
4. Missing evidence lowers confidence or produces an explicit unknown.
5. The same ticket identity survives Discover → X-Ray → Pulse → Autopsy.
6. The first screen leads with one decision, one main risk, and one next action.
7. Recommendation strength cannot outrun its evidence. Threshold escalation and similarly strong actions fail closed when required evidence is unavailable.
8. Personalization must be grounded in eligible reviewed outcomes, not generic profile inference.
9. Legacy implementations may be studied but may not silently become production authorities again.
10. Product complexity should move behind progressive disclosure rather than accumulating above the fold.
11. Decision-time lineage required for later evaluation must not be overwritten by settlement-time knowledge.
12. System evaluation may recommend a policy change but may not silently authorize or deploy one.
13. Calibration claims must distinguish provider reliability, recommendation quality, bettor behavior, and outcome variance rather than collapsing them into one opaque score.
14. No aggregate ticket score may hide or override a severe identified structural constraint without an explicit policy rationale.
15. X-Ray, Pulse, and Autopsy must be able to explain material state changes as continuity of the same ticket thesis where evidence supports that continuity.
16. Observed facts, derived measurements, inferences, and speculation may inform one another but must not be silently collapsed into the same truth state.
17. A recommendation should be evaluated against the constraint it was intended to address, not only against whether the final ticket won or lost.

## Current phase

ResearchBets is currently between **Product Truth** and **Habit**.

That means the current priority is not broad feature expansion. It is to make the canonical loop fast, truthful, coherent, mobile-usable, and valuable enough that bettors voluntarily return to X-Ray another ticket.

The active sequencing and measurable completion gates are maintained in `docs/EXECUTION_PLAN.md`.

## Convergence order

1. **Declare authority:** maintain this decision record, the machine-readable manifest, and automated drift checks.
2. **Unify identity:** remove page-specific trace/slip aliases behind boundary adapters.
3. **Unify read models:** make the canonical lifecycle consume `ResearchRunDTO` plus explicit stage extensions.
4. **Unify persistence:** keep local stores as offline caches while `RuntimeStore` becomes durable authority.
5. **Converge routes:** move unique `/today`, `/slip`, and `/track` capabilities into the canonical lifecycle, then convert them to compatibility redirects.
6. **Archive UI generations:** retain legacy source and tests as reference fixtures, but exclude them from canonical imports and product navigation.
7. **Close the learning loop:** capture recommendation decisions, settlement, counterfactual eligibility, reviewed memory, state-transition context, and decision-time lineage so the system can improve future advice and later evaluate its own calibration without inventing performance claims.

## Definition of converged

ResearchBets is converged when a ticket can be created once and resolved by the same identity across all four canonical stages; each stage reads a compatible canonical model; live/cache/demo/stale/unknown provenance remains intact; one primary ResearchBets answer/action is obvious at each stage; material state changes can be traced through the lifecycle; and legacy implementations can be removed from the build without changing the consumer journey.
