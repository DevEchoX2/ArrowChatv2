import { assertNotBlocked, assertRateLimit, assertChatMembership, assertAdminRole } from "./guards.js";

function now() {
  return Date.now();
}

export function createGroupChannel({ actorId, name, memberIds, countPerMinute }) {
  assertRateLimit({ countPerMinute, threshold: 10 });
  const channelName = String(name || "").trim();
  if (!channelName || channelName.length > 80) throw new Error("Invalid channel name");

  const uniqueMembers = [...new Set([actorId, ...(memberIds || [])].filter(Boolean))];
  if (!uniqueMembers.length) throw new Error("Channel must include members");

  return {
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
