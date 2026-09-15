# ResearchBets Strategy

This document defines the company-level strategy behind the canonical product. `docs/CANONICAL_PRODUCT.md` remains the product/architecture authority for routes, contracts, and convergence. This file answers a different question: **what company are we trying to build, and why should it matter?**

## Company thesis

**ResearchBets is the decision layer between a bettor and a sportsbook.**

A sportsbook answers **what can I bet?** ResearchBets should answer:

> **What does this ticket depend on, where is it fragile, what would make it better, how is that thesis changing live, and what should I learn afterward?**

The initial wedge is parlay structural risk because multi-leg tickets are difficult for humans to reason about as systems. Bettors naturally evaluate legs one at a time; ResearchBets evaluates the ticket as a connected structure with threshold, price, exposure, correlation, game-script, and evidence dependencies.

The product is not a picks service and should not compete on manufactured certainty. It should become the place a bettor checks **before** placing a ticket, **during** the event, and **after** settlement.

## Behavior we want to own

The habit is simple:

> **Before you place the parlay, X-Ray it.**

The canonical lifecycle supports that habit:

`Discover + Build → Ticket X-Ray → Ticket Pulse → Ticket Autopsy + Memory`

The company becomes more valuable as this loop closes. A one-time analyzer is useful. A system that remembers the original thesis, tracks what changed, observes the outcome, and learns from repeated decision patterns can become durable personal betting intelligence.

## Product promise

ResearchBets should make a complex decision feel simple:

1. **One primary pressure** — what can break the ticket?
2. **Supporting evidence** — why does ResearchBets believe that?
3. **One next action** — hold, step down, selectively escalate, remove, replace, or inspect deeper.
4. **Progressive depth** — expose the machinery only when the bettor asks for it.

The intelligence should feel deeper than the interface.

A useful reference pattern is:

> **Ticket → ResearchBets read → next action → deeper detail on demand**

## Strategic wedge

We are not trying to win every sports-betting category at once.

ResearchBets should not attempt to become, in the near term:

- a sportsbook clone,
- a generic sports-news destination,
- a social betting feed,
- a fantasy platform,
- a tout marketplace,
- a leaderboard/contest product,
- an autonomous wagering agent,
- a giant dashboard of undifferentiated scores,
- or a chatbot whose primary value is generating parlays.

Those may be adjacent markets or legacy experiments, but they are not the current company wedge.

The wedge is:

> **Structural decision intelligence for recreational sports betting, beginning with parlays.**

## Four core engines

### 1. Market Truth Layer

Own the facts required to reason safely:

- events and participants,
- player availability,
- posted markets and alternate thresholds,
- price and sportsbook provenance,
- freshness,
- effective live/cache/demo/unavailable state.

ResearchBets can be uncertain. It must not pretend certainty. Missing or stale evidence should lower confidence, fail closed, or remain explicitly unknown.

### 2. Structural Risk Engine

Evaluate the ticket as a system:

- weakest-leg pressure,
- threshold aggressiveness,
- price structure,
- same-player dependency,
- same-game and game-script correlation,
- concentrated exposure,
- fragility,
- volatility,
- failure modes.

This is the analytical core of Ticket X-Ray.

### 3. Decision Engine

Translate analysis into an action rather than another dashboard score:

- hold,
- step down,
- selective escalation,
- remove,
- replace,
- or gather more evidence.

Threshold Advisor is an early form of this engine. Recommendations must preserve provenance and should fail closed when the market ladder or supporting evidence cannot be verified.

### 4. Bettor Memory

Turn settled history into personalized decision intelligence:

- recurring threshold mistakes,
- repeated correlation patterns,
- ticket-size and price-band tendencies,
- player/market construction habits,
- breaker-leg patterns,
- miss distance,
- whether prior ResearchBets interventions would have helped.

Personalization must be grounded in reviewed outcomes, not generic profile theater. Demo or unverified artifacts must not become performance claims.

## Cross-cutting capability: System Calibration

ResearchBets should eventually learn not only **about the bettor**, but also **about the reliability of its own evidence and recommendations**.

This is not a fifth user-facing engine and should not become another dashboard, agent console, or piece of internal machinery the bettor must understand. It is a platform capability that sits underneath all four engines.

The long-term system should support three distinct learning loops:

1. **Evidence reliability** — which providers, sources, enrichment paths, freshness windows, and fallback states are dependable in which contexts.
2. **Bettor learning** — which construction patterns, risk tendencies, and repeated mistakes are specific to the individual bettor.
3. **Recommendation learning** — when ResearchBets warnings, abstentions, threshold changes, removals, or escalations were calibrated, noisy, late, or unsupported.

A mature ResearchBets system should be able to ask of itself:

- Did the evidence available at decision time justify the strength of the recommendation?
- Did the identified structural pressure actually matter after settlement?
- Which recommendation classes are well calibrated and which generate too many false alarms?
- When ResearchBets said **unknown** or withheld a strong action, was that abstention appropriate?
- Are particular providers, data paths, or freshness states repeatedly associated with bad downstream reads?
- Did a recommendation improve the ticket under a reproducible counterfactual, or does hindsight merely make it look smart?

The principle is:

> **ResearchBets should become self-calibrating, not self-authorizing.**

System evaluation may produce metrics, proposals, experiments, or candidate policy changes. It must not silently rewrite production decision policy, confidence thresholds, source weights, or user-facing claims. Changes that affect product judgment should be versioned, tested, reviewed, and deliberately promoted.

To make that possible later, decision-time records should preserve enough lineage to reconstruct what ResearchBets knew when it acted: evidence/provenance, freshness, relevant source identifiers, recommendation and policy version, and the exact alternative being proposed where applicable.

Demo, synthetic, inferred-only, or otherwise ineligible records must not train reliability claims about the system.

## The compounding moat

Odds, public statistics, LLM access, and UI can all be copied. The defensible loop is the longitudinal dataset created when ResearchBets connects:

`ticket → evidence snapshot → recommendation → bettor decision → live evolution → outcome → counterfactual → system evaluation → learning`

A particularly valuable record is not merely that a leg won or lost, but that:

- the bettor considered a threshold,
- ResearchBets made a recommendation from a specific evidence state,
- the bettor accepted or rejected it,
- the event settled,
- the system can evaluate the counterfactual,
- and ResearchBets can later evaluate whether its own recommendation class and evidence path were trustworthy.

Over time this can support calibrated claims about intervention quality instead of unsupported AI confidence language.

The long-term proof questions are:

> **Do ResearchBets interventions measurably improve ticket construction quality versus comparable tickets where the intervention was not followed?**

and

> **Can ResearchBets identify when its own evidence or recommendation process is poorly calibrated and improve it through reviewed, reproducible changes?**

Do not claim either until the data is sufficient, reviewed, and methodologically defensible.

## Brand position

ResearchBets should feel closer to a serious research terminal than a tout feed.

Brand behavior:

- calm,
- evidence-first,
- skeptical,
- provenance-aware,
- willing to say **hold**, **unknown**, **no verified edge**, or **do not add another leg**.

Avoid the category's lowest-trust patterns: exaggerated confidence percentages, "locks," guaranteed winners, fake urgency, and promotional certainty.

A useful brand principle is:

> **ResearchBets does not need the bettor to place the bet. It needs the bettor to understand the bet.**

## Business model hypothesis

Monetization should follow demonstrated product habit and decision value, not precede them.

Potential progression:

1. **Free** — basic ticket construction and X-Ray.
2. **ResearchBets Pro** — full Threshold Advisor, deeper X-Ray, live Pulse, advanced research, bettor memory, history, and personalized guardrails.
3. **ResearchBets Intelligence** — later APIs, widgets, or tooling for media, communities, analytics platforms, or regulated operators.

Avoid allowing sportsbook affiliate economics to distort product judgment. The sportsbook may benefit when a bettor wagers more; ResearchBets should benefit when the bettor makes a better-informed decision.

## Company metrics hierarchy

Do not optimize for vanity traffic first. The early company must prove behavior and usefulness.

### Primary early habit metric

**7-day X-Ray repeat rate** — percentage of users who analyze another ticket within seven days.

### Supporting behavior metrics

- time from first visit to first useful ResearchBets answer,
- percentage of tickets reaching X-Ray,
- percentage of X-Rays where a recommendation is understood/interacted with,
- percentage of tickets where a suggested modification is accepted,
- percentage of tracked tickets that reach settlement/review,
- percentage of reviewed tickets contributing verified bettor-memory data,
- repeat usage across multiple event days.

### Later proof metrics

- intervention acceptance rate by recommendation type,
- counterfactual ticket survival / construction improvement,
- calibration of structural warnings,
- false-alarm and missed-warning rates on eligible reviewed outcomes,
- evidence-source coverage, freshness, and downstream reliability by context,
- abstention quality when ResearchBets withholds a strong recommendation,
- bettor-specific pattern recurrence after a guardrail is introduced,
- retention lift as verified memory depth increases.

Never convert these into claims of guaranteed profitability or winning outcomes.

## Current company phase

ResearchBets is currently between **Product Truth** and **Habit**.

The strategic sequence is:

1. **Product Truth** — trustworthy data state, stable identity, fast useful answers, canonical lifecycle, no false certainty.
2. **Habit** — make X-Ray useful enough that bettors instinctively run a ticket through it before lock.
3. **Intelligence** — accumulate verified outcomes, decisions, counterfactuals, bettor-specific patterns, and the decision-time lineage needed to evaluate ResearchBets itself.
4. **Proof** — demonstrate that specific ResearchBets interventions improve decision quality and that warning/recommendation classes are calibrated with defensible measurement.
5. **Scale** — paid tiers, broader sport coverage, distribution, integrations, and B2B surfaces.

Do not skip phases. Features that do not materially advance the current phase should be deprioritized.

## Strategic decision filter

Before adding a feature, ask:

1. Does this make the canonical loop faster, clearer, more trustworthy, or more habitual?
2. Does it strengthen one of the four core engines?
3. Does it create higher-quality verified longitudinal data?
4. Does it help ResearchBets make a better decision recommendation rather than display more information?
5. Would removing this feature make the product feel smarter?
6. Does it improve our ability to audit or calibrate ResearchBets later without adding machinery the bettor has to understand?

If the answer is mostly no, do not build it now.
