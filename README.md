# ArrowChat v2

A clean black/white chat dashboard scaffold with Firebase-ready architecture.

## Structure
- `apps/web`: frontend dashboard UI
- `services/api`: privileged backend/service stubs
- `shared`: shared constants/types/utilities
- `infra/firebase`: Firebase rules/indexes/config templates
- `docs`: setup and architecture documentation

## Run locally (static)
From `apps/web`:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Firebase setup
See `/home/runner/work/ArrowChatv2/ArrowChatv2/docs/FIREBASE_SETUP.md`.
