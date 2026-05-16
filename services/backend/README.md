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
PRIVATE_ACCESS_PASSWORD='replace-me' SESSION_SECRET='replace-me' COOKIE_SECURE=false npm start
```

By default the backend listens on `127.0.0.1:3001`.

## Authentication
- `POST /api/auth/session` with `{ "password": "...", "userId": "owner" }`
- Session is set in an httpOnly cookie (`workspace_session`)
- `POST /api/auth/logout` clears the session

## API surface
- `GET /api/health`
- `GET /api/me`
- `GET/POST /api/messages`
- `POST /api/friends/request`
- `POST /api/blocks`
- `POST /api/channels`
- `POST /api/reactions`
- `POST /api/read-receipts`
- `GET/POST /api/presence`
- `GET /api/moderation`
- `POST /api/moderation/:reportId`
- `GET /api/search`
- `GET /ws` (websocket)
