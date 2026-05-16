# Production Readiness Checklist

- [x] Production scope and acceptance criteria documented (`docs/PRODUCTION_SCOPE.md`)
- [x] Architecture ownership boundaries and API contracts documented (`docs/ARCHITECTURE.md`)
- [x] Auth/session hardening implemented (runtime config validation + expiring sessions)
- [x] Core chat production API behavior implemented (pagination/read receipt retrieval)
- [x] Resilience controls implemented (idempotent message posting and sync endpoint)
- [x] Observability endpoints implemented (`/api/health`, `/api/ready`, `/api/metrics`, `/api/audit`)
- [x] Quality gate established (backend unit/integration tests + CI workflow)
- [x] Deployment/operations maturity docs added (`docs/VPS_DEPLOYMENT.md`, `docs/OPERATIONS_RUNBOOK.md`)
- [x] Security verification checklist added (`docs/SECURITY_VERIFICATION.md`)
- [ ] Run load testing in staging and record SLO evidence
- [ ] Execute game day simulation and capture outcomes
- [ ] Collect final stakeholder sign-off for phased production launch
