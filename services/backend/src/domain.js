import { assertNotBlocked, assertRateLimit, assertChatMembership, assertAdminRole } from "./guards.js";
import { randomUUID } from "node:crypto";

function now() {
  return Date.now();
}

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
    id: `m-${randomUUID()}`,
    chatId: chat.id,
    senderId,
    text: cleaned,
    createdAt: now(),
    createdBy: senderId,
    updatedAt: now(),
    updatedBy: senderId
  };
}

export function createFriendRequest({ requesterId, targetId, existingRelations, countPerMinute }) {
  assertRateLimit({ countPerMinute, threshold: 15 });
  if (requesterId === targetId) throw new Error("Cannot friend yourself");

  const duplicate = existingRelations.some(
    (f) =>
      (f.userId === requesterId && f.friendId === targetId) ||
      (f.userId === targetId && f.friendId === requesterId)
  );

  if (duplicate) throw new Error("Friend relationship already exists");

  return {
    userId: requesterId,
    friendId: targetId,
    status: "pending",
    createdAt: now(),
    createdBy: requesterId,
    updatedAt: now(),
    updatedBy: requesterId
  };
}

export function blockUser({ blockerId, blockedId }) {
  if (blockerId === blockedId) throw new Error("Cannot block yourself");

  return {
    blockerId,
    blockedId,
    createdAt: now(),
    createdBy: blockerId,
    updatedAt: now(),
    updatedBy: blockerId
  };
}

export function createGroupChannel({ actorId, name, memberIds, countPerMinute }) {
  assertRateLimit({ countPerMinute, threshold: 10 });
  const channelName = String(name || "").trim();
  if (!channelName || channelName.length > 80) throw new Error("Invalid channel name");

  const uniqueMembers = [...new Set([actorId, ...(memberIds || [])].filter(Boolean))];
  if (!uniqueMembers.length) throw new Error("Channel must include members");

  return {
    id: `ch-${randomUUID()}`,
    type: "group",
    name: channelName,
    memberIds: uniqueMembers,
    createdBy: actorId,
    createdAt: now(),
    updatedBy: actorId,
    updatedAt: now()
  };
}

export function addMessageReaction({ actorId, message, emoji, chat, blocks, countPerMinute }) {
  assertRateLimit({ countPerMinute, threshold: 60 });
  assertChatMembership({ chat, userId: actorId });

  if (message.senderId !== actorId) {
    assertNotBlocked({ senderId: actorId, receiverId: message.senderId, blocks });
  }

  const normalizedEmoji = String(emoji || "").trim();
  if (!normalizedEmoji || normalizedEmoji.length > 8) throw new Error("Invalid emoji payload");

  return {
    id: `r-${randomUUID()}`,
    messageId: message.id,
    chatId: message.chatId,
    userId: actorId,
    emoji: normalizedEmoji,
    createdAt: now(),
    createdBy: actorId,
    updatedAt: now(),
    updatedBy: actorId
  };
}

export function markMessageRead({ actorId, chat, messageId }) {
  assertChatMembership({ chat, userId: actorId });
  return {
    id: `rr-${randomUUID()}`,
    messageId,
    chatId: chat.id,
    userId: actorId,
    readAt: now(),
    createdAt: now(),
    createdBy: actorId,
    updatedAt: now(),
    updatedBy: actorId
  };
}

export function updatePresence({ actorId, status, typingInChatId = "" }) {
  const allowed = new Set(["online", "away", "busy", "offline"]);
  if (!allowed.has(status)) throw new Error("Invalid presence status");

  return {
    userId: actorId,
    status,
    typingInChatId,
    lastSeenAt: now(),
    createdAt: now(),
    createdBy: actorId,
    updatedAt: now(),
    updatedBy: actorId
  };
}

export function moderateMessage({ actorId, actorRole, report, action }) {
  assertAdminRole({ actorRole });
  const allowed = new Set(["dismiss", "hide", "remove", "suspend-user"]);
  if (!allowed.has(action)) throw new Error("Invalid moderation action");

  return {
    ...report,
    action,
    status: "resolved",
    resolvedBy: actorId,
    resolvedAt: now(),
    updatedAt: now(),
    updatedBy: actorId
  };
}

export function searchMessages({ actorId, chat, query, sourceMessages }) {
  assertChatMembership({ chat, userId: actorId });
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];

  return (sourceMessages || [])
    .filter((m) => m.chatId === chat.id)
    .filter((m) => String(m.text || "").toLowerCase().includes(q))
    .slice(0, 50);
}
