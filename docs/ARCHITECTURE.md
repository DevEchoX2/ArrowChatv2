# Private Dashboard Architecture

## Production ownership boundaries
- **Frontend (`apps/web`)**
  - Renders chat/dashboard UX and runtime config state.
  - Must not perform privileged authorization checks.
- **Backend runtime (`services/backend`)**
  - Single source of truth for auth/session enforcement, rate limiting, moderation, and chat APIs.
  - Exposes HTTP + WebSocket surface used by deployed clients.
- **Shared contracts (`shared`)**
  - Shared constants, model assumptions, and sanitization helpers.
- **Firebase policy (`infra/firebase`)**
  - Data access policy for Firebase-hosted resources and index/rule definitions.
- **Legacy reference (`services/api`)**
  - Privileged flow reference only; not directly exposed in production runtime.

## Modules in current runtime
- Auth/session
- Global chat and group channels
- DMs/friendship and blocking primitives
- Reactions and read receipts
- Presence + typing signals
- Moderation and search
- Notifications/media scaffolding

## API ownership contract
- Frontend may call only documented `/api/*` endpoints.
- Authorization decisions are server-side only.
- Membership checks are data-field based (`chat.memberIds`) and never inferred from document IDs.
- POST `/api/messages` supports idempotent retries with `Idempotency-Key`.
- GET `/api/messages` supports cursor pagination (`v=2`, `limit`, `before`).

## Data model collections
- users
- profiles
- preferences
- friendships
- blocks
- chats
- chat_members
- channels
- messages
- reactions
- read_receipts
- presence
- moderation_reports
- notifications
- attachments

All records should include: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

## Reliability and operations model
- `/api/health` for liveness checks
- `/api/ready` for runtime readiness/config validation
- `/api/metrics` for lightweight scrape-friendly counters
- `/api/sync` for client reconnect/state recovery snapshots
- `/api/audit` for recent security-sensitive action trail
