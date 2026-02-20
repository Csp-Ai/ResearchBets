# UX Map

## Route map
- `/` — Landing (animated preview, analyze/scout/continue CTAs)
- `/research` — Core hub
  - Analyze Slip
  - Scout Props
  - Live Games
- `/ingest` — Slip capture/paste/upload
- `/discover` — Optional slip builder
- `/pending-bets` — Tracking + historical outcomes entry
- `/agents` — Agent directory + ask-agent prompts
- `/community` — Feed of shareable ideas/receipts
- `/u/[username]` — Anonymous profile page
- `/settings` — Developer mode + provider connection health
- `/traces` — Developer-only diagnostics

## Hub interactions
### Analyze Slip
- Hero verdict card with confidence and weakest-leg callout.
- One-tap actions: remove weakest leg, rerun research, save/share receipt.
- Expandable “Why this verdict?” drawer in conversational style.

### Scout Props
- Today/live game cards.
- Active player list by role.
- Suggested props with hit-rate badges (L5/L10) and plain-language reasons.

### Live Games
- Live/upcoming scoreboard rows.
- Team records and quick matchup context.
- Win likelihood split with short rationale stack.

## Motion + accessibility
- Framer Motion for page transitions, shared cards, and skeleton states.
- Reduced motion: disable movement-heavy transitions and use opacity-only fades.
