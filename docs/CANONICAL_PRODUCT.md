# ResearchBets Canonical Product

This document is the product and architecture decision record for convergence. When an older audit, route map, UI variant, or implementation note conflicts with this file and `config/convergence.json`, this document wins.

## North Star

**ResearchBets is a Structural Risk Terminal for parlays — not a picks service.**

It helps a bettor discover candidates, construct a ticket, identify structural failure risk, follow the same ticket live, and learn from settlement. It does not promise winners or manufacture certainty.

## Canonical lifecycle

| Stage            | Product name            | Canonical route | Primary question                                                  |
| ---------------- | ----------------------- | --------------- | ----------------------------------------------------------------- |
| Discover + Build | ResearchBets Home       | `/`             | What is worth investigating, and what belongs together?           |
| Before           | Ticket X-Ray            | `/stress-test`  | What is most likely to break this ticket before lock?             |
| During           | Ticket Pulse            | `/pulse`        | What is carrying the ticket, and what is under verified pressure? |
| After            | Ticket Autopsy + Memory | `/review`       | Why did it break or hold, and what should change next time?       |

`/ingest`, `/slip`, and `/today` remain supported as alternate or expanded entry surfaces while their unique capabilities are folded into the canonical lifecycle. Compatibility and internal routes are listed in `config/convergence.json`.

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

1. Live, cache, demo, parsed, inferred, and verified states remain distinguishable.
2. No synthetic progress appears as live progress.
3. Demo artifacts do not train bettor memory or performance claims.
4. Missing evidence lowers confidence or produces an explicit unknown.
5. The same ticket identity survives Discover → X-Ray → Pulse → Autopsy.
6. The first screen leads with one decision, one main risk, and one next action.
7. Legacy implementations may be studied but may not silently become production authorities again.

## Convergence order

1. **Declare authority:** maintain this decision record, the machine-readable manifest, and automated drift checks.
2. **Unify identity:** remove page-specific trace/slip aliases behind boundary adapters.
3. **Unify read models:** make the canonical lifecycle consume `ResearchRunDTO` plus explicit stage extensions.
4. **Unify persistence:** keep local stores as offline caches while `RuntimeStore` becomes durable authority.
5. **Converge routes:** move unique `/today`, `/slip`, and `/track` capabilities into the canonical lifecycle, then convert them to compatibility redirects.
6. **Archive UI generations:** retain legacy source and tests as reference fixtures, but exclude them from canonical imports and product navigation.

## Definition of converged

ResearchBets is converged when a ticket can be created once and resolved by the same identity across all four canonical stages; each stage reads a compatible canonical model; live/cache/demo provenance remains intact; and legacy implementations can be removed from the build without changing the consumer journey.
