import test from "node:test";
import assert from "node:assert/strict";
import {
  addMessageReaction,
  createGroupChannel,
  createFriendRequest,
  markMessageRead,
  sendMessagePrivileged,
  updatePresence
} from "../src/domain.js";

test("sendMessagePrivileged validates membership and payload", () => {
  const chat = { id: "global", memberIds: ["u1", "u2"] };
  const message = sendMessagePrivileged({
    senderId: "u1",
    chat,
    text: "hello",
    blocks: [],
    countPerMinute: 1
  });

  assert.equal(message.chatId, "global");
  assert.equal(message.senderId, "u1");
  assert.equal(message.text, "hello");
});

test("createFriendRequest rejects duplicates", () => {
  const existingRelations = [{ userId: "u1", friendId: "u2" }];
  assert.throws(() => {
    createFriendRequest({
      requesterId: "u2",
      targetId: "u1",
      existingRelations,
      countPerMinute: 1
    });
  });
});

test("createGroupChannel normalizes members and includes actor", () => {
  const channel = createGroupChannel({
    actorId: "owner",
    name: "general",
    memberIds: ["u1", "u1", "owner"],
    countPerMinute: 1
  });

  assert.equal(channel.type, "group");
  assert.deepEqual(channel.memberIds.sort(), ["owner", "u1"]);
});

test("addMessageReaction enforces emoji and membership", () => {
  const reaction = addMessageReaction({
    actorId: "u1",
    message: { id: "m1", senderId: "u2", chatId: "global" },
    emoji: "👍",
    chat: { id: "global", memberIds: ["u1", "u2"] },
    blocks: [],
    countPerMinute: 1
  });

  assert.equal(reaction.messageId, "m1");
  assert.equal(reaction.userId, "u1");
});

test("markMessageRead and updatePresence produce valid records", () => {
  const receipt = markMessageRead({
    actorId: "u1",
    chat: { id: "global", memberIds: ["u1"] },
    messageId: "m1"
  });
  assert.equal(receipt.chatId, "global");

  const presence = updatePresence({
    actorId: "u1",
    status: "online",
    typingInChatId: "global"
  });
  assert.equal(presence.status, "online");
  assert.equal(presence.typingInChatId, "global");
});
