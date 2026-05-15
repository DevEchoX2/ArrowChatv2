export const MODEL_HINTS = {
  users: ["id", "email", "displayName", "createdAt", "updatedAt"],
  profiles: ["userId", "bio", "avatarUrl", "createdAt", "updatedAt"],
  preferences: ["userId", "theme", "globalBg", "notificationPrefs"],
  friendships: ["userId", "friendId", "status", "createdAt"],
  blocks: ["blockerId", "blockedId", "createdAt"],
  chats: ["id", "type", "name", "memberIds", "createdBy", "createdAt", "updatedAt"],
  chat_members: ["chatId", "userId", "role", "createdAt"],
  channels: ["id", "name", "memberIds", "createdBy", "createdAt", "updatedAt"],
  messages: ["chatId", "senderId", "text", "attachmentId", "createdAt", "updatedAt"],
  reactions: ["messageId", "chatId", "userId", "emoji", "createdAt"],
  read_receipts: ["messageId", "chatId", "userId", "readAt"],
  presence: ["userId", "status", "typingInChatId", "lastSeenAt", "updatedAt"],
  moderation_reports: ["chatId", "messageId", "reporterId", "reason", "status", "createdAt"],
  notifications: ["userId", "type", "payload", "read", "createdAt"],
  attachments: ["ownerId", "chatId", "path", "mimeType", "size"]
};
