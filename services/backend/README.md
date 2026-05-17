# Private Backend (VPS)

This is the single backend service for private hosting.

## Stack
- Node.js
- Fastify
- `@fastify/websocket`
- `@fastify/cookie`

## Run
```bash
cd services/backend
npm install
PRIVATE_ACCESS_PASSWORD='replace-with-strong-password' SESSION_SECRET='replace-with-very-long-secret-at-least-32-chars' COOKIE_SECURE=false npm start
```

By default the backend listens on `127.0.0.1:3001`.

## Authentication
- `POST /api/auth/session` with `{ "password": "...", "userId": "yourname" }`
- Session is set in an httpOnly cookie (`workspace_session`)
- `POST /api/auth/logout` clears the session
- Usernames are claimed at login and cannot be reused while the process is running

## API surface
- `GET /api/health`
- `GET /api/ready`
- `GET /api/metrics`
- `GET /api/me`
- `GET /api/users` (active/claimed usernames for discovery)
- `GET /api/chats` (caller-visible chats)
- `POST /api/dms` (create/reuse direct chat with another username)
- `GET /api/messages` (supports `v=2`, `limit`, `before` for paginated reads)
- `POST /api/messages` (supports `Idempotency-Key` for retry-safe writes)
- `POST /api/friends/request`
- `POST /api/blocks`
- `POST /api/channels`
- `POST /api/reactions`
- `GET/POST /api/read-receipts`
- `GET/POST /api/presence`
- `GET /api/moderation`
- `POST /api/moderation/:reportId`
- `GET /api/search`
- `GET /api/sync`
- `GET /api/audit`
- `GET /api/announcements`
- `GET /ws` (websocket)

WebSocket also carries secure user-to-user call signaling events (`call-request`, `call-accept`, `call-decline`, `webrtc-offer`, `webrtc-answer`, `webrtc-ice`, `call-end`) for P2P voice/video setup.

## Production config guardrails
- `PRIVATE_ACCESS_PASSWORD` must be at least 12 chars.
- `SESSION_SECRET` must be at least 32 chars.
- In `NODE_ENV=production`: default credentials are rejected and `COOKIE_SECURE` must be true.
