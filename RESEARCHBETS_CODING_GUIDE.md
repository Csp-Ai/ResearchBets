# 🧠 RESEARCHBETS_CODING_GUIDE.md

This is the foundational guide for building, extending, and contributing to the ResearchBets codebase. It is Codex-aware, ADHD-friendly, and user-obsessed. This project is not just a prop data tool — it's a decision engine for modern bettors.

## 🧭 Product North Star

> **"Will this prop hit tonight?"**
> We exist to compress 45 minutes of betting research into 45 seconds of clarity — backed by form, matchups, injury data, and traceable reasoning.

Our job is to:

* Turn uploaded slips into readable, explainable decisions
* Tag each prop with trend, volatility, and matchup signals
* Let users *understand* the risk, not just hope it hits
* Build toward a trusted parlay-building companion

---

## 🧱 Architectural Anchors

### `MarketType`

* Located in: `src/core/markets/marketType.ts`
* This is the **single source of truth** for all prop types (`points`, `3pm`, `ra`, `pra`, etc.)
* Always use `asMarketType()` to normalize inputs

### `buildPropLegInsight`

* Located in: `src/core/slips/propInsights.ts`
* Use this to generate structured leg intelligence:

  * Label (e.g. `PTS`, `RA`)
  * Hit rate (e.g. 4/5)
  * Matchup signal
  * Volatility tag (e.g. solid, volatile)

### `extract.ts`

* Parses uploaded slips (images or structured input)
* Now generates normalized market types and default props (e.g. player ➝ `points`)

### `buildResearchSnapshot.ts`

* Powers the full snapshot pipeline
* Prop-aware: accepts marketType, filters recommendations, scopes rationale

### `ResearchSnapshotAgent`

* Summarizes legs, context, and creates prop-first trace rationale

### `SnapshotReplayView`

* Located in: `features/snapshot/SnapshotReplayView.tsx`
* Renders each leg insight: market label, hit rate bar, volatility badge, matchup context, and optional replay toggle (when `traceId` + `?replay=1`)

### `getParlayCorrelationScore`, `summarizeParlayRisk`

* Located in: `src/core/parlay/parlayRisk.ts`
* Scores risk of multi-leg bets, flags same-game correlation, and estimates variance strength

### UI Path: `/features/betslip` ➝ `/research/snapshot/[id]`

* All UI should start with slip or player input
* Render insight tiles with trend/risk/matchup BEFORE full graphs or data
* `/research` enters replay mode automatically when `?replay=1`

---

## 🧠 Codex & Contributor Guidelines

### 🧩 Always:

* Use `MarketType` for anything prop-related
* Generate leg insight via `buildPropLegInsight`
* Scope research summaries by `marketType`
* Show trend/matchup/risk before stats volume
* Extend `SnapshotReplayView` for any insight UI updates

### 🧪 Tests must:

* Validate correct fallback to default props (e.g. points)
* Assert normalized market typing
* Confirm snapshot summaries are scoped to props
* Assert leg insight tags (hit rate, trend, volatility)
* Cover parlay scoring logic with mock legs

---

## 🧠 How Sports Bettors Actually Use This

### What They Care About:

* "Is this leg sharp or risky?"
* "Should I build around this or fade it?"
* "What’s the matchup saying?"

### What They Hate:

* Walls of data
* Conflicting logic
* Unexplained flags or labels

### What Works:

* Upload slip ➝ see insights in tiles (trend, tag, matchup)
* Add leg ➝ get instant snapshot risk summary
* View rationale if they want depth (trace graph optional)
* Return to track what worked ("3PM props hit 5/6 for you last week")
* View `/research/snapshot/[id]` with replay = instant trust

---

## 💸 "Tip Us" Callout (Optional Support Button)

If one of your parlays hit thanks to our research…

> 💡 Consider tipping the engine that helped you nail it:

* [ Tip via Stripe or Crypto → Coming Soon ]
* [ Contribute via GitHub Sponsors → Coming Soon ]
* [ Buy Us Coffee, Fund a Feature, Keep ResearchBets Sharp ]

This keeps us building. Every dollar keeps the engine open-source, transparent, and evolving with you.

---

## 👀 For LLMs / Codex

* Context files to prioritize:

  * `marketType.ts`, `buildPropLegInsight.ts`, `buildResearchSnapshot.ts`
  * `ResearchSnapshotAgent.ts`, `extract.ts`, `BetSlipIngestionForm.tsx`
  * `SnapshotReplayView.tsx`, `parlayRisk.ts`
* Use comment tags like `// @codex-insight` and `// @market-aware` to embed guidance
* Codex completions should favor:

  * Prop-type first logic
  * Risk-tag-driven UI
  * Snapshot-aware routing
  * Parlay leg summary logic over raw duplication

---

## 🔁 In Closing

> This repo turns sports betting into a readable, trustable experience.

If you're adding code here, you're not just building tools — you're helping a bettor decide, in real-time, whether to trust their gut.

Build clear. Build prop-native. Build it sharp.

— ResearchBets
