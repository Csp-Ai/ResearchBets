# KPI Framework Baseline

## Scope
This framework defines shared metrics for product adoption, engagement, model quality, and business impact.

## Metric Definitions and Formulas

### 1) DAU bettors
**Definition:** Distinct users who placed at least one tracked bet during a UTC day.

**Formula:**

`DAU_bettors(d) = COUNT(DISTINCT user_id WHERE bet_placed_date = d)`

### 2) Research queries per user
**Definition:** Average number of research/analysis queries initiated per active user in a period.

**Formula:**

`research_queries_per_user(p) = total_research_queries(p) / active_users(p)`

### 3) Slips analyzed per week
**Definition:** Number of distinct bet slips processed by the agent each ISO week.

**Formula:**

`slips_analyzed_week(w) = COUNT(DISTINCT slip_id WHERE analyzed_week = w)`

### 4) D14 retention
**Definition:** Share of newly activated users on day `d0` who return and perform a qualifying action on day `d0 + 14`.

**Formula:**

`D14_retention = retained_users_on_d14 / cohort_users_d0`

### 5) Tracked-bet adoption
**Definition:** Share of active bettors whose bets are tracked in-platform versus total active bettors.

**Formula:**

`tracked_bet_adoption(p) = active_bettors_with_tracked_bets(p) / total_active_bettors(p)`

### 6) CLV delta
**Definition:** Incremental customer lifetime value of users exposed to agent guidance versus a comparable control cohort.

**Formula:**

`CLV_delta = CLV_exposed_cohort - CLV_control_cohort`

### 7) Agent accuracy
**Definition:** Fraction of scored decisions that match eventual binary outcome labels.

**Formula:**

`agent_accuracy(p) = correct_decisions(p) / total_scored_decisions(p)`

For non-binary markets, use market-specific correctness rules and normalize before aggregation.

### 8) Confidence calibration
**Definition:** Alignment between predicted confidence and realized success rates.

**Recommended calculation:** Expected Calibration Error (ECE).

**Formula:**

`ECE = Σ_k (|B_k| / n) * |acc(B_k) - conf(B_k)|`

Where each `B_k` is a confidence bin, `acc(B_k)` is empirical accuracy in the bin, and `conf(B_k)` is mean confidence in the bin.

## Data Quality Requirements
- All KPI source records must include `request_id`, `user_id`, `agent_id`, `model_version`, and `timestamp` when applicable.
- Daily KPI aggregates should be reproducible from raw event and warehouse tables.
- Null handling and exclusion criteria must be versioned in metric logic definitions.
