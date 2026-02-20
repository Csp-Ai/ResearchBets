# Agent Directory (Bettor Language)

## Agent roster
- **Injury Insider**
  - What it does: tracks availability and rotation-impacting absences.
  - Inputs: injury feed, projected starters, status updates.
- **Line Sensei**
  - What it does: scans lines/odds movement and consensus drift.
  - Inputs: sportsbook prices, implied probabilities, movement windows.
- **Trend Rider**
  - What it does: summarizes recent form (last 5/10) by market.
  - Inputs: player game logs, role/usage trend snapshots.
- **Matchup Sniper**
  - What it does: highlights opponent-specific edges and team context.
  - Inputs: opponent splits, pace, defensive profile, H2H context.
- **Prop Finder**
  - What it does: surfaces high-probability prop opportunities from active slates.
  - Inputs: game slate, props board, trend and injury signals.
- **Coach Talk**
  - What it does: translates role/rotation signals into bettor-language notes.
  - Inputs: minutes trends, lineup changes, beat-report summaries.

## Contribution model
For each verdict/prop card we show:
- contributing agents (lightweight chips)
- one sentence on the most important agent input
- optional “Ask this agent” preset prompts

## Guardrails
- Never use lock/guarantee language.
- Always show uncertainty notes when critical inputs are missing.
