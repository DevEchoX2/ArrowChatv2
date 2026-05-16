import { assertRateLimit } from "./guards.js";

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
    createdAt: Date.now(),
    createdBy: requesterId,
    updatedAt: Date.now(),
    updatedBy: requesterId
  };
}

export function blockUser({ blockerId, blockedId }) {
  if (blockerId === blockedId) throw new Error("Cannot block yourself");

  return {
    blockerId,
    blockedId,
    createdAt: Date.now(),
    createdBy: blockerId,
    updatedAt: Date.now(),
    updatedBy: blockerId
  };
}
