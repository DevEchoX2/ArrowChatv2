# Privileged API Layer (server-side)

This folder is for operations that must not be trusted from client-side code:
- Friendship lifecycle checks
- Block checks on message send
- Rate limiting and abuse controls
- Moderation hooks
- Notification fan-out

Deploy as Cloud Functions / Cloud Run API and keep secrets server-side only.
