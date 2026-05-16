# Security Verification Checklist

## Application security checks
- [ ] Verify no default production credentials are used (`/api/ready` must be green)
- [ ] Validate session cookie controls (`httpOnly`, `sameSite=strict`, secure in prod)
- [ ] Validate authorization on chat/message routes with non-member users
- [ ] Validate moderation actions require elevated role

## Abuse and resilience checks
- [ ] Validate per-user rate limit behavior for message and social actions
- [ ] Validate block relationship enforcement for direct interactions
- [ ] Validate idempotency behavior for repeated message POST retries

## Firebase policy checks
- [ ] Firestore rules deployed from `infra/firebase/firestore.rules`
- [ ] Membership checks rely on `chats.memberIds` and authenticated identity
- [ ] Storage rules deployed from `infra/firebase/storage.rules`

## Dependency and CI checks
- [ ] `npm ci && npm test` passes in `services/backend`
- [ ] GitHub Actions backend CI workflow succeeds
- [ ] Dependency advisories reviewed before release

## Pre-release review evidence
- [ ] Capture test run output
- [ ] Capture readiness/health probe output
- [ ] Capture rule deployment revision and timestamp
