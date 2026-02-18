# Release Checklist

Use this checklist before every production deploy.

## 1) Readiness

- [ ] CI is green on the release branch.
- [ ] Environment validation passes (`scripts/validate-env`).
- [ ] Required docs are up to date (architecture, governance, release checklist).

## 2) Rollback Plan

- [ ] Previous stable version/tag is identified and documented.
- [ ] Rollback owner is assigned and reachable.
- [ ] Rollback command/runbook is tested or dry-run reviewed.
- [ ] Database migration rollback/forward strategy is documented.

## 3) Monitoring Checks

- [ ] Dashboards for API latency, error rate, and saturation are live.
- [ ] Alerts are configured and routed to on-call.
- [ ] Log sampling is active for release-specific endpoints.
- [ ] Synthetic checks/passive health checks are green.

## 4) KPI Review (Pre-Deploy)

- [ ] Baseline KPIs are captured (conversion, retention, engagement, or revenue proxies).
- [ ] Guardrail thresholds are set for automatic rollback consideration.
- [ ] Release hypothesis and success criteria are documented.

## 5) Deploy Controls

- [ ] Deployment window and communication plan are confirmed.
- [ ] Feature flags/default states are verified.
- [ ] Canary/staged rollout plan is selected.

## 6) Post-Deploy Verification

- [ ] Smoke tests pass in production.
- [ ] No critical alerts after initial observation window.
- [ ] KPI movement is within expected range.
- [ ] Incident/issues are logged with owners and deadlines.
