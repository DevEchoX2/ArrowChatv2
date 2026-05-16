# Production Scope and Acceptance Criteria

## Must-have capability scope
- Authenticated workspace access with server-side session validation
- Chat messaging, channels, moderation, reactions, read receipts, search, and presence APIs
- Abuse controls: rate limiting, block enforcement, and idempotent write support for retry-safe clients
- Operational endpoints: health, readiness, metrics, and sync recovery
- CI quality gate for backend test execution on push and pull requests

## Supported environments
- **dev**: local development with insecure cookie override (`COOKIE_SECURE=false`)
- **staging**: production-like runtime with secure cookies and staging credentials
- **prod**: hardened runtime with non-default secrets/passwords and secure cookies

## Security and compliance baseline
- Server-side authorization and chat membership checks
- Session cookies marked `httpOnly`, `sameSite=strict`, and secure in production
- Startup readiness validation rejects unsafe production runtime config
- Firebase rule model enforces authenticated and membership-based access

## Service-level objectives (initial targets)
- API uptime target: 99.9%
- p95 message POST latency: < 250ms under normal load
- p95 message read latency: < 200ms under normal load
- Error budget alert when 5xx ratio > 1% over 5 minutes

## Acceptance criteria for production completeness
- Backend test suite passes locally and in CI
- Readiness endpoint is green in staging/prod
- Deployment/runbook and incident checklist are documented
- Security verification checklist is completed for each release
