# Private Chat Dashboard

A private chat dashboard scaffold with static frontend + single backend architecture.

## Structure
- `apps/web`: frontend dashboard UI
- `services/backend`: single VPS backend (Fastify + WebSocket)
- `services/api`: legacy privileged operation reference (not deployed)
- `shared`: shared constants/types/utilities
- `infra/firebase`: Firebase rules/indexes/config templates
- `docs`: setup and architecture documentation

## Run frontend locally (static)
From `apps/web`:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Run backend locally
From `services/backend`:

```bash
npm install
PRIVATE_ACCESS_PASSWORD='replace-me' SESSION_SECRET='replace-me' COOKIE_SECURE=false npm start
```

Backend binds to `127.0.0.1:3001` by default.

## VPS deployment
See `docs/VPS_DEPLOYMENT.md`.

## Production docs
- `docs/PRODUCTION_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/SECURITY_VERIFICATION.md`
- `docs/PRODUCTION_READINESS_CHECKLIST.md`
