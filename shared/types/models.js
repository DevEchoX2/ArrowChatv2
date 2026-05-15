export const MODEL_HINTS = {
  users: ["id", "email", "displayName", "createdAt", "updatedAt"],
  profiles: ["userId", "bio", "avatarUrl", "createdAt", "updatedAt"],
  preferences: ["userId", "theme", "globalBg", "notificationPrefs"],
  friendships: ["userId", "friendId", "status", "createdAt"],
  blocks: ["blockerId", "blockedId", "createdAt"],
  chats: ["id", "type", "name", "createdBy", "createdAt"],
  chat_members: ["chatId", "userId", "role", "createdAt"],
  messages: ["chatId", "senderId", "text", "attachmentId", "createdAt"],
  notifications: ["userId", "type", "payload", "read", "createdAt"],
  attachments: ["ownerId", "chatId", "path", "mimeType", "size"]
};
