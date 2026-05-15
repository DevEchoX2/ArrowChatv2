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

## Phase 2 Modules
- Group channels
- Message reactions
- Read receipts
- Moderation/admin tools
- Search
- Presence and typing indicators

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
- channels
- messages
- reactions
- read_receipts
- presence
- moderation_reports
- notifications
- attachments

All records should use `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

## Membership verification policy
- Do not rely on document IDs for membership verification.
- Membership checks are based on data fields (`chats.memberIds`) and rule lookups.
