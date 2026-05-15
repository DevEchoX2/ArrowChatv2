export function requireAuth(context) {
  if (!context?.auth?.uid) {
    throw new Error("Unauthenticated request");
  }
  return context.auth.uid;
}

export function assertNotBlocked({ senderId, receiverId, blocks }) {
  const isBlocked = blocks.some(
    (b) =>
      (b.blockerId === senderId && b.blockedId === receiverId) ||
      (b.blockerId === receiverId && b.blockedId === senderId)
  );
  if (isBlocked) {
    throw new Error("Interaction forbidden due to block relationship");
  }
}

export function assertRateLimit({ countPerMinute, threshold = 30 }) {
  if (countPerMinute > threshold) {
    throw new Error("Rate limit exceeded");
  }
}
