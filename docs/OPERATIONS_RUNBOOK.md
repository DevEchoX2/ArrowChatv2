# Operations Runbook

## Health and readiness
- Liveness: `GET /api/health`
- Readiness: `GET /api/ready`
- Metrics: `GET /api/metrics`

If readiness is failing in production:
1. Validate `PRIVATE_ACCESS_PASSWORD`, `SESSION_SECRET`, and `COOKIE_SECURE`.
2. Confirm process env and secret injection for the runtime.
3. Restart process after correcting configuration.

## Incident response flow
1. Detect from uptime alerts, 5xx alerts, or user-reported outage.
2. Scope impact (all API routes vs specific route family).
3. Mitigate (rollback last deploy or rotate bad config/secrets).
4. Verify recovery with `/api/ready` and smoke tests.
5. Capture timeline and corrective actions in post-incident notes.

## Alerting baseline
- Uptime probe failure on `/api/health`
- Readiness failures on `/api/ready`
- Elevated error ratio (>=1% 5xx over 5 minutes)
- Elevated auth failures indicating possible abuse

## Backup and restore drills
- Export durable data (if persistence backing store is enabled) on scheduled cadence.
- Verify restore procedure in staging monthly.
- Document restore timestamp and validation outcome after each drill.

## Release and rollback
- Promote dev -> staging -> prod with same artifact/runtime settings.
- Run backend tests before promotion.
- Rollback strategy: redeploy previous known-good image/revision and verify readiness.
