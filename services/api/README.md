# Legacy Privileged API Reference (server-side)

This folder is for operations that must not be trusted from client-side code:
- Friendship lifecycle checks
- Block checks on message send
- Rate limiting and abuse controls
- Moderation hooks
- Notification fan-out
- Group channel, reaction, read-receipt, search, and presence operations

## Verification policy
- Do not verify permissions from document ID structure.
- Verify from authenticated identity and document fields (for example `chat.memberIds`).

This folder is now reference logic only.

For VPS/private hosting, deploy `services/backend` as the single runtime backend and do not expose this folder directly.
