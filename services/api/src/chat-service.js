import { assertNotBlocked, assertRateLimit, assertChatMembership } from "./guards.js";

export function sendMessagePrivileged({ senderId, chat, text, blocks, countPerMinute }) {
  assertRateLimit({ countPerMinute });
  assertChatMembership({ chat, userId: senderId });

  const recipientIds = (chat.memberIds || []).filter((userId) => userId !== senderId);
  recipientIds.forEach((receiverId) => {
    assertNotBlocked({ senderId, receiverId, blocks });
  });

  const cleaned = String(text || "").trim();
  if (!cleaned || cleaned.length > 2000) {
    throw new Error("Invalid message payload");
  }

  return {
    chatId: chat.id,
    senderId,
    text: cleaned,
    createdAt: Date.now(),
    createdBy: senderId,
    updatedAt: Date.now(),
    updatedBy: senderId
  };
}
