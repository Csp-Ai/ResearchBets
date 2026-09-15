# ResearchBets Product UX + Performance Audit

## Mission

Experience ResearchBets as a first-time and returning bettor, end to end, before adding another major feature.

The goal is not to admire the code or prove that routes render. The goal is to determine whether the product is understandable, fast, visually coherent, trustworthy, and useful enough that someone would want to use it before, during, and after a real bet.

Treat this as a customer-journey teardown, visual-design critique, performance investigation, and bug hunt.

## Product truth

ResearchBets is a Structural Risk Terminal for parlays, not a picks service.

Canonical lifecycle:

1. Discover / Build
2. Ticket X-Ray
3. Ticket Pulse
4. Ticket Autopsy / Memory

Canonical surfaces:

- `/` — Discover / Build entry
- `/slip` — staged ticket construction
- `/stress-test` — Ticket X-Ray
- `/pulse` — live Ticket Pulse
- `/review` — Ticket Autopsy / Memory

Supporting and legacy routes may be inspected for useful capabilities, but they must not redefine the canonical customer journey.

## Audit operating rule

Do not begin by redesigning or coding.

First observe the current product. Capture evidence. Follow the journey. Measure. Identify friction. Then decide what deserves to change.

Run the current `main` branch in a production-like environment whenever possible (`npm run build` + `npm start`) rather than judging only from dev mode.

If live provider credentials are unavailable, use deterministic/demo states where supported and explicitly distinguish live-data failures from product/UI failures.

## Primary customer journey

Run at least these scenarios.

### Scenario A — first-time bettor

Start at `/` with no prior context.

Determine within 5 seconds:

- What is ResearchBets?
- What problem does it solve?
- What is the primary action?
- Is it immediately obvious that this is risk analysis / construction intelligence rather than a picks feed?

Then attempt to:

1. find a game / prop idea
2. add multiple legs
3. understand the staged ticket
4. use Threshold Advisor
5. move into Ticket X-Ray
6. understand the weakest leg / construction risk
7. move into tracking
8. understand the live ticket state
9. reach post-game review / memory

Record every hesitation, duplicate concept, dead end, unclear CTA, unexpected route change, and context loss.

### Scenario B — user arrives with an existing sportsbook ticket

Attempt to ingest or reconstruct a ticket rather than discovering props inside ResearchBets.

Determine whether the fastest path to X-Ray is obvious and whether the app unnecessarily forces the user through discovery/build concepts.

### Scenario C — returning bettor

Assume the bettor already understands the product and wants to get from opening the app to a useful answer in under 30 seconds.

Look for repeated onboarding copy, unnecessary cards, route transitions, waits, and duplicated analysis.

### Scenario D — live game

With a tracked ticket, inspect Pulse behavior when:

- verified live progress exists
- progress is delayed
- a provider is unavailable
- one leg is clearly under pressure
- one leg has already cashed

Confirm that truth boundaries remain obvious and that unavailable data never looks like zero progress.

## Screenshot protocol

Capture screenshots at minimum for:

- `/` desktop + mobile
- `/slip` empty state
- `/slip` with a realistic 4–6 leg ticket
- `/slip` with Threshold Advisor populated
- `/stress-test` initial load + completed X-Ray
- `/pulse` tracked-ticket state
- `/review` settled-ticket state
- any error/loading state that lasts long enough for a user to notice
- any page that feels visually inconsistent with the canonical product

Use a consistent desktop viewport (around 1440×900) and mobile viewport (around 390×844) so comparisons are meaningful.

For each screenshot annotate or record:

- what the user should notice first
- what actually dominates attention
- strongest element
- weakest / most confusing element
- redundant information
- CTA clarity
- spacing / hierarchy problems
- trust problems

## Visual-design review

Judge the product as a premium consumer-fintech / sports-intelligence product, not as an internal dashboard.

Specifically inspect:

- information hierarchy
- typography scale and consistency
- density
- card-within-card syndrome
- excessive borders / gradients / badges
- competing accent colors
- tiny uppercase microcopy
- text contrast
- repeated disclaimers
- duplicated metrics
- navigation clarity
- primary vs secondary actions
- whether every panel earns its screen space
- whether the user sees an answer or a collection of widgets
- consistency across Discover, Build, X-Ray, Pulse, and Review
- mobile scanning and thumb reach
- empty/loading/error-state quality

Ask repeatedly: **what could be removed while making the product feel more intelligent?**

## Performance review

Measure cold and warm navigation separately.

Capture at least:

- time to first meaningful UI
- time to usable interaction
- route-to-route transition time
- number of blocking requests
- obvious API waterfalls
- repeated fetching of the same data
- unnecessary client-side work
- layout shifts
- long skeleton/loading periods
- large JS routes / hydration cost
- image/font cost
- duplicate provider calls

Pay special attention to the canonical journey and especially `/stress-test`, `/slip`, `/pulse`, and `/review`.

Use the production build output as an initial bundle signal, but validate perceived performance in-browser. Treat a technically successful build as different from a fast experience.

Investigate whether data could be:

- fetched once and shared across lifecycle surfaces
- prefetched before navigation
- cached safely
- rendered server-side
- lazy-loaded below the fold
- split out of the initial JS bundle
- deferred until the user requests deeper detail

## Build-flow focus

The current staged-ticket experience contains multiple intelligence surfaces. Determine whether the user actually needs to see all of them simultaneously.

Evaluate the relationship between:

- Bet Ticket
- Threshold Advisor
- Slip Builder
- Pro Build
- Slip Optimizer
- pattern warnings / suggested fixes
- lifecycle tracker
- Analyze / Track actions

Look specifically for duplicated responsibility. Recommend one clear hierarchy rather than preserving panels because code already exists.

## Bug hunt

Test:

- add / remove / reorder legs
- duplicate legs
- changing threshold tiers repeatedly
- safety → undo/re-escalate behavior
- escalation → step back behavior
- stale live-market data
- provider unavailable
- reload / back / forward navigation
- direct-linking canonical routes
- preservation of ticket / slip / trace identity
- empty ticket
- one-leg ticket
- long ticket
- mixed games
- mobile widths
- browser refresh between lifecycle stages
- loading states
- error states
- malformed / partial imported slips

For every bug, record:

- route
- exact reproduction steps
- expected result
- actual result
- severity
- screenshot / console evidence when available

## Audit output

Produce one concise product-audit report with four sections.

### 1. Executive read

Answer in plain language:

- What ResearchBets currently feels like
- What it should feel like
- The three biggest things preventing that

### 2. Journey map

For every lifecycle stage, grade:

- clarity
- speed
- visual quality
- usefulness
- trust

Use A–F grades and one sentence explaining each weak grade.

### 3. Evidence-backed issue backlog

Rank findings:

- P0 — broken / false / blocks core journey
- P1 — major friction, performance, or trust problem
- P2 — important UX / visual cleanup
- P3 — polish

Every issue should include evidence, impact, and the smallest high-leverage fix.

Do not turn every observation into a ticket. Group symptoms under root causes.

### 4. Next product move

Recommend the smallest set of changes that would create the largest improvement in perceived quality and speed.

Prefer convergence and removal over adding more surfaces.

If the audit shows that visual design is the largest weakness, propose a single coherent design direction and identify which canonical surface should be redesigned first as the reference implementation.

If performance is the largest weakness, identify the biggest measurable bottleneck before proposing broad optimization work.

## Definition of done

The audit is done when we can answer:

1. Where does a new user get confused?
2. What looks cheap, noisy, or inconsistent?
3. What feels slow, and why?
4. What is duplicated?
5. What is actually broken?
6. Which current features should disappear or merge?
7. What are the top 3 changes that would make ResearchBets feel materially better this week?

Do not ship a broad redesign until these answers are supported by screenshots, timings, or concrete journey evidence.
