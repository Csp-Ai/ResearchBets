# Everyday Bettor OS Vision

## Product North Star
ResearchBets is evolving from a dense research console into an animation-first sports betting companion for everyday bettors. The experience should feel like a premium sports app with group-chat clarity: quick verdicts, plain-language reasons, and immediate actions.

## Core experience principles
1. **Verdict first, details second**: every analysis starts with the one dominant insight.
2. **Always-active player context**: props and recommendations only feature active/available players.
3. **Likelihood language, never guarantees**: phrasing always frames outputs as research guidance.
4. **Progressive disclosure**: reasons and inputs are available, but never overwhelm first view.
5. **Anonymous-first identity**: accountless read mode by default; profiles/community unlock with opt-in identity.
6. **Motion with purpose**: transitions guide attention; reduced-motion mode fully supported.

## Unknown unknowns findings (repo scan)
- Command-center vibe comes from shell framing and dense chip/terminal UI in `src/components/terminal/AppShell.tsx`, `app/globals.css`, and diagnostic-heavy sections in `app/research/page.tsx`.
- Data contracts currently center on slip execution; props/live/community schemas need dedicated contracts in a bettor-oriented layer.
- Provider boundaries already exist (`src/core/providers/registry.server.ts`) and should remain server-only while adding a bettor-facing gateway for live games, props, injuries, and matchup context.
- Persistence for historical bets, profiles, and community requires schema expansion in Supabase migrations.
- Existing ingest → research run pipeline should be reused for Analyze mode while adding Scout/Live as parallel read models.

## First shippable release scope
- Landing rebuild with animation-rich demo and clear CTAs.
- `/research` hub tabs: Analyze Slip, Scout Props, Live Games.
- Props scout MVP with active players, last-5 hit rates, and injury-aware filtering.
- Live games MVP with season W/L and plain-language win probability reasoning.
- Agents renamed to bettor language plus agent directory UI.
- Provider gateway with deterministic demo mode fallback.
