# ArrowChat Architecture

## MVP Modules
- Auth
- Global chat
- DMs
- Notifications
- Friends
- Blocked users
- Settings
- Media upload

## Core layers
- Frontend: `apps/web`
- Privileged operations: `services/api`
- Shared contracts: `shared`
- Security and data policy: `infra/firebase`

## Data model collections
- users
- profiles
- preferences
- friendships
- blocks
- chats
- chat_members
- messages
- notifications
- attachments

All records should use `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

## Rule-friendly membership convention
- `chat_members` document IDs should follow: `${chatId}_${userId}`.
- This enables direct membership checks in Firestore rules using `exists(...)`.
