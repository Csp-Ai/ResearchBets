# ResearchBets MVP

ResearchBets is an AI-assisted sports research product built around one loop:

**Upload Slip → Extract → Verify Context → Identify Pattern → Surface Assumptions → Save → Post-Game Reflection**

## Core Product Principle

Do not build a betting AI. Build a thinking system.

The product edge is:
- structure,
- verification,
- and post-game reflection.

## MVP Scope (NBA-first)

1. **Today's Games**: schedule, confirmed lineups, totals/spreads, and injury feed.
2. **Slip Upload**: screenshot/text upload, extracted legs, user edits, extraction confidence.
3. **Research Output**: strictly ordered Facts → Context → Patterns → Assumptions.
4. **Post-Game Review**: leg outcomes + structured reflection output.

Authentication is optional for saving history; research workflows remain usable anonymously.

## Minimal Viable Intelligence (4-agent pipeline)

ResearchBets deliberately uses a pipeline (not a free-form swarm):

1. **SlipRecognition**
   - Converts unstructured sportsbook input into structured legs.
   - No opinions, only extraction.
2. **ContextVerification**
   - Reads immutable context (starters, injuries, pace, spread/total, recent usage).
   - Produces timestamped evidence records.
3. **PatternClassification**
   - Labels slip construction patterns and surfaces assumptions.
   - Keeps facts and inference separated.
4. **Reflection**
   - Post-game comparison of assumptions vs outcomes.
   - No predictions, no advice, no blame.

Every agent reads JSON and outputs JSON. Downstream agents cannot rewrite upstream facts.

## Evidence Metadata Contract

Every claim-like item should be represented as:

```json
{
  "claim": "",
  "evidence": "",
  "source_type": "",
  "timestamp": "",
  "confidence": 0.0
}
```

This evidence layer is mandatory for trust and auditability.

## Local Development Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Quality gates

```bash
npm run lint
npm run typecheck
npm run format
node scripts/validate-agent-registry
```
