import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import {
  addMessageReaction,
  blockUser,
  createFriendRequest,
  createGroupChannel,
  markMessageRead,
  moderateMessage,
  searchMessages,
  sendMessagePrivileged,
  updatePresence
} from "./domain.js";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT || "3001", 10);
const ACCESS_PASSWORD = process.env.PRIVATE_ACCESS_PASSWORD || "change-this-password";
const SESSION_COOKIE_NAME = "workspace_session";
const SESSION_TTL_SECONDS = Number.parseInt(process.env.SESSION_TTL_SECONDS || "86400", 10);
const COOKIE_SECURE = process.env.COOKIE_SECURE !== "false";

const app = Fastify({ logger: true });
await app.register(fastifyCookie, {
  secret: process.env.SESSION_SECRET || "replace-with-session-secret"
});
await app.register(fastifyWebsocket);

const sessions = new Map();
const presenceByUser = new Map();
const countsByUser = new Map();
const chatsById = new Map([["global", { id: "global", memberIds: [] }]]);
const messages = [];
const relationships = [];
const blocks = [];
const channels = [];
const reactions = [];
const readReceipts = [];
const moderationReports = [{ id: "rpt-1", messageId: "m-1", reason: "spam", status: "open" }];

function now() {
  return Date.now();
}

function createId(prefix) {
  return `${prefix}-${now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseRequestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  return {};
}

function getCountPerMinute(userId) {
  const bucket = countsByUser.get(userId);
  const current = now();
  if (!bucket || current - bucket.windowStart > 60000) {
    countsByUser.set(userId, { windowStart: current, count: 1 });
    return 1;
  }

  bucket.count += 1;
  countsByUser.set(userId, bucket);
  return bucket.count;
}

function ensureGlobalMembership(userId) {
  const global = chatsById.get("global");
  if (!global.memberIds.includes(userId)) {
    global.memberIds.push(userId);
  }
}

function requireSession(request) {
  const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
  const userId = sessions.get(sessionId);
  if (!userId) {
    throw app.httpErrors.unauthorized("Session required");
  }

  ensureGlobalMembership(userId);
  return userId;
}

function requireChat(chatId, userId) {
  const chat = chatsById.get(chatId);
  if (!chat) throw app.httpErrors.notFound("Chat not found");
  if (!chat.memberIds.includes(userId)) throw app.httpErrors.forbidden("Not in chat");
  return chat;
}

app.get("/api/health", async () => ({ ok: true, service: "private-backend" }));

app.post("/api/auth/session", async (request, reply) => {
  const body = parseRequestBody(request);
  const password = String(body.password || "");
  const requestedUser = String(body.userId || "owner").trim().toLowerCase();
  const userId = requestedUser || "owner";

  if (password !== ACCESS_PASSWORD) {
    throw app.httpErrors.unauthorized("Invalid credentials");
  }

  const sessionId = createId("sess");
  sessions.set(sessionId, userId);
  ensureGlobalMembership(userId);

  reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "strict",
    secure: COOKIE_SECURE,
    maxAge: SESSION_TTL_SECONDS,
    signed: false,
    path: "/"
  });

  return { ok: true, userId };
});

app.post("/api/auth/logout", async (request, reply) => {
  const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
  if (sessionId) {
    sessions.delete(sessionId);
  }
  reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  return { ok: true };
});

app.get("/api/me", async (request) => {
  const userId = requireSession(request);
  return { userId, hasSession: true };
});

app.post("/api/messages", async (request) => {
  const userId = requireSession(request);
  const body = parseRequestBody(request);
  const chatId = String(body.chatId || "global");
  const chat = requireChat(chatId, userId);

  const message = sendMessagePrivileged({
    senderId: userId,
    chat,
    text: body.text,
    blocks,
    countPerMinute: getCountPerMinute(userId)
  });

  messages.unshift(message);
  return message;
});

app.get("/api/messages", async (request) => {
  const userId = requireSession(request);
  const chatId = String(request.query?.chatId || "global");
  requireChat(chatId, userId);
  return messages.filter((m) => m.chatId === chatId).slice(0, 100);
});

app.post("/api/friends/request", async (request) => {
  const userId = requireSession(request);
  const body = parseRequestBody(request);
  const relation = createFriendRequest({
    requesterId: userId,
    targetId: String(body.targetId || "").trim(),
    existingRelations: relationships,
    countPerMinute: getCountPerMinute(userId)
  });
  relationships.unshift(relation);
  return relation;
});

app.post("/api/blocks", async (request) => {
  const userId = requireSession(request);
  const body = parseRequestBody(request);
  const record = blockUser({
    blockerId: userId,
    blockedId: String(body.blockedId || "").trim()
  });
  blocks.unshift(record);
  return record;
});

app.post("/api/channels", async (request) => {
  const userId = requireSession(request);
  const body = parseRequestBody(request);
  const channel = createGroupChannel({
    actorId: userId,
    name: body.name,
    memberIds: Array.isArray(body.memberIds) ? body.memberIds : [],
    countPerMinute: getCountPerMinute(userId)
  });

  channels.unshift(channel);
  chatsById.set(channel.id, { id: channel.id, memberIds: channel.memberIds });
  return channel;
});

app.post("/api/reactions", async (request) => {
  const userId = requireSession(request);
  const body = parseRequestBody(request);
  const message = messages.find((m) => m.id === body.messageId);
  if (!message) throw app.httpErrors.notFound("Message not found");
  const chat = requireChat(message.chatId, userId);

  const reaction = addMessageReaction({
    actorId: userId,
    message,
    emoji: body.emoji,
    chat,
    blocks,
    countPerMinute: getCountPerMinute(userId)
  });

  reactions.unshift(reaction);
  return reaction;
});

app.post("/api/read-receipts", async (request) => {
  const userId = requireSession(request);
  const body = parseRequestBody(request);
  const chat = requireChat(String(body.chatId || "global"), userId);
  const receipt = markMessageRead({
    actorId: userId,
    chat,
    messageId: String(body.messageId || "").trim()
  });
  readReceipts.unshift(receipt);
  return receipt;
});

app.post("/api/presence", async (request) => {
  const userId = requireSession(request);
  const body = parseRequestBody(request);
  const record = updatePresence({
    actorId: userId,
    status: String(body.status || "").trim(),
    typingInChatId: String(body.typingInChatId || "").trim()
  });
  presenceByUser.set(userId, record);
  return record;
});

app.get("/api/presence", async (request) => {
  requireSession(request);
  return [...presenceByUser.values()];
});

app.post("/api/moderation/:reportId", async (request) => {
  const userId = requireSession(request);
  const body = parseRequestBody(request);
  const reportId = String(request.params?.reportId || "");
  const report = moderationReports.find((r) => r.id === reportId);
  if (!report) throw app.httpErrors.notFound("Report not found");

  const resolved = moderateMessage({
    actorId: userId,
    actorRole: String(body.actorRole || "owner"),
    report,
    action: String(body.action || "")
  });

  const index = moderationReports.findIndex((r) => r.id === reportId);
  moderationReports[index] = resolved;
  return resolved;
});

app.get("/api/moderation", async (request) => {
  requireSession(request);
  return moderationReports;
});

app.get("/api/search", async (request) => {
  const userId = requireSession(request);
  const chatId = String(request.query?.chatId || "global");
  const chat = requireChat(chatId, userId);
  const query = String(request.query?.q || "");
  return searchMessages({
    actorId: userId,
    chat,
    query,
    sourceMessages: messages
  });
});

const wsClients = new Map();

app.get("/ws", { websocket: true }, (socket, request) => {
  const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
  const userId = sessions.get(sessionId);
  if (!userId) {
    socket.close(1008, "Unauthorized");
    return;
  }

  ensureGlobalMembership(userId);
  wsClients.set(socket, userId);
  socket.send(JSON.stringify({ type: "welcome", userId }));

  socket.on("message", (raw) => {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const text = String(payload?.text || "").trim();
    if (!text || text.length > 500) return;

    const event = {
      type: "chat",
      id: createId("ws"),
      userId,
      text,
      createdAt: now()
    };
    const encoded = JSON.stringify(event);
    wsClients.forEach((_uid, client) => {
      if (client.readyState === 1) {
        client.send(encoded);
      }
    });
  });

  socket.on("close", () => {
    wsClients.delete(socket);
  });
});

try {
  await app.listen({ host: HOST, port: PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
