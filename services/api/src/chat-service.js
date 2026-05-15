import { assertNotBlocked, assertRateLimit } from "./guards.js";

export function sendMessagePrivileged({ senderId, chatId, text, members, blocks, countPerMinute }) {
  assertRateLimit({ countPerMinute });

  const recipientIds = members.filter((m) => m.chatId === chatId).map((m) => m.userId);
  recipientIds.forEach((receiverId) => {
    if (receiverId !== senderId) {
      assertNotBlocked({ senderId, receiverId, blocks });
    }
  });

  const cleaned = String(text || "").trim();
  if (!cleaned || cleaned.length > 2000) {
    throw new Error("Invalid message payload");
  }

  return {
    chatId,
    senderId,
    text: cleaned,
    createdAt: Date.now(),
    createdBy: senderId,
    updatedAt: Date.now(),
    updatedBy: senderId
  };
}
