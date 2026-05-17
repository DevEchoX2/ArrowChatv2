import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
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

const SESSION_COOKIE_NAME = "workspace_session";
const MAX_MESSAGE_PAGE_SIZE = 100;
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

function now() {
  return Date.now();
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function parseRequestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  return {};
}

function parsePositiveInteger(input, fallback) {
  const value = Number.parseInt(String(input ?? ""), 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function parseTimestamp(input) {
  const value = Number.parseInt(String(input ?? ""), 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function normalizeUserId(input) {
  const value = String(input || "").trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,24}$/.test(value)) {
    throw httpError(400, "Username must be 3-24 chars (a-z, 0-9, _, -)");
  }
  return value;
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEnv(env = process.env) {
  const host = env.HOST || "127.0.0.1";
  const port = parsePositiveInteger(env.PORT, 3001);
  const accessPassword = env.PRIVATE_ACCESS_PASSWORD || "change-this-password";
  const sessionSecret = env.SESSION_SECRET || "replace-with-session-secret";
  const sessionTtlSeconds = parsePositiveInteger(env.SESSION_TTL_SECONDS, 86400);
  const cookieSecure = env.COOKIE_SECURE !== "false";
  const nodeEnv = env.NODE_ENV || "development";
  const webRoot = env.WEB_ROOT || join(dirname(fileURLToPath(import.meta.url)), "../../../apps/web");

  return {
    host,
    port,
    accessPassword,
    sessionSecret,
    sessionTtlSeconds,
    cookieSecure,
    nodeEnv,
    webRoot
  };
}

function validateRuntimeConfig(config) {
  const errors = [];
  if (config.accessPassword.length < 12) {
    errors.push("PRIVATE_ACCESS_PASSWORD must be at least 12 characters");
  }
  if (config.sessionSecret.length < 32) {
    errors.push("SESSION_SECRET must be at least 32 characters");
  }

  if (config.nodeEnv === "production") {
    if (config.accessPassword === "change-this-password") {
      errors.push("PRIVATE_ACCESS_PASSWORD cannot use default value in production");
    }
    if (config.sessionSecret === "replace-with-session-secret") {
      errors.push("SESSION_SECRET cannot use default value in production");
    }
    if (!config.cookieSecure) {
      errors.push("COOKIE_SECURE must be true in production");
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

function getIdempotencyKey(request, body) {
  const fromHeader = request.headers["idempotency-key"];
  const candidate = String(fromHeader || body.idempotencyKey || "").trim();
  if (!candidate) return "";
  if (candidate.length > 128) throw httpError(400, "Idempotency key too long");
  return candidate;
}

function withAudit(auditLog, event) {
  auditLog.unshift({ id: createId("audit"), at: now(), ...event });
  if (auditLog.length > 1000) {
    auditLog.length = 1000;
  }
}

export async function createApp({ env = process.env } = {}) {
  const config = normalizeEnv(env);
  const runtimeValidation = validateRuntimeConfig(config);

  const app = Fastify({ logger: true });
  await app.register(fastifyCookie, {
    secret: config.sessionSecret
  });
  await app.register(fastifyWebsocket);

  await app.register(fastifyStatic, {
    root: config.webRoot,
    prefix: "/",
    decorateReply: true
  });

  const sessions = new Map(); // sessionId -> { userId, expiresAt }
  const registeredUsers = new Set();
  const idempotentMessages = new Map(); // userId:key -> { message, createdAt }
  const presenceByUser = new Map();
  const countsByUser = new Map();
  const chatsById = new Map([["global", { id: "global", type: "global", name: "Global Chat", memberIds: [] }]]);
  const messages = [];
  const relationships = [];
  const blocks = [];
  const channels = [];
  const reactions = [];
  const readReceipts = [];
  const moderationReports = [{ id: "rpt-1", messageId: "m-1", reason: "spam", status: "open" }];
  const auditLog = [];
  const announcements = [
    { id: "ann-1", title: "Welcome", body: "Private workspace is live on your VPS.", createdAt: now() }
  ];
  const updateLogs = [{ id: "upd-1", body: "Initial production chat stack available.", createdAt: now() }];

  function cleanupExpiredIdempotency() {
    const threshold = now() - IDEMPOTENCY_TTL_MS;
    idempotentMessages.forEach((entry, key) => {
      if (entry.createdAt < threshold) {
        idempotentMessages.delete(key);
      }
    });
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
    if (!sessionId) throw httpError(401, "Session required");

    const session = sessions.get(sessionId);
    if (!session) throw httpError(401, "Session required");

    if (session.expiresAt <= now()) {
      sessions.delete(sessionId);
      throw httpError(401, "Session expired");
    }

    ensureGlobalMembership(session.userId);
    return { userId: session.userId, sessionId };
  }

  function requireChat(chatId, userId) {
    const chat = chatsById.get(chatId);
    if (!chat) throw httpError(404, "Chat not found");
    if (!chat.memberIds.includes(userId)) throw httpError(403, "Not in chat");
    return chat;
  }

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 400;
    reply.code(statusCode).send({
      ok: false,
      error: error?.message || "Request failed"
    });
  });

  app.get("/api/health", async () => ({
    ok: true,
    service: "private-backend",
    now: now()
  }));

  app.get("/api/ready", async (_request, reply) => {
    if (!runtimeValidation.ok) {
      reply.code(503);
      return {
        ok: false,
        service: "private-backend",
        errors: runtimeValidation.errors
      };
    }

    return {
      ok: true,
      service: "private-backend"
    };
  });

  app.get("/api/metrics", async (_request, reply) => {
    reply.header("content-type", "text/plain; version=0.0.4; charset=utf-8");
    return [
      `arrowchat_sessions ${sessions.size}`,
      `arrowchat_presence ${presenceByUser.size}`,
      `arrowchat_messages ${messages.length}`,
      `arrowchat_channels ${channels.length}`,
      `arrowchat_reactions ${reactions.length}`,
      `arrowchat_read_receipts ${readReceipts.length}`
    ].join("\n");
  });

  app.post("/api/auth/signup", async (request, reply) => {
    const body = parseRequestBody(request);
    const password = String(body.password || "");
    const userId = normalizeUserId(body.userId || "");

    if (password !== config.accessPassword) {
      throw httpError(401, "Invalid credentials");
    }
    if (registeredUsers.has(userId)) {
      throw httpError(409, "Username already taken");
    }

    registeredUsers.add(userId);

    const sessionId = createId("sess");
    sessions.set(sessionId, {
      userId,
      expiresAt: now() + config.sessionTtlSeconds * 1000
    });
    ensureGlobalMembership(userId);

    reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "strict",
      secure: config.cookieSecure,
      maxAge: config.sessionTtlSeconds,
      signed: false,
      path: "/"
    });

    withAudit(auditLog, { type: "auth.signup", actorId: userId });
    return { ok: true, userId };
  });

  app.post("/api/auth/session", async (request, reply) => {
    const body = parseRequestBody(request);
    const password = String(body.password || "");
    const userId = normalizeUserId(body.userId || "");

    if (password !== config.accessPassword) {
      throw httpError(401, "Invalid credentials");
    }
    if (!registeredUsers.has(userId)) {
      throw httpError(404, "Account not found: sign up first");
    }

    const sessionId = createId("sess");
    sessions.set(sessionId, {
      userId,
      expiresAt: now() + config.sessionTtlSeconds * 1000
    });
    ensureGlobalMembership(userId);

    reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "strict",
      secure: config.cookieSecure,
      maxAge: config.sessionTtlSeconds,
      signed: false,
      path: "/"
    });

    withAudit(auditLog, { type: "auth.signin", actorId: userId });
    return { ok: true, userId };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session?.userId) {
        withAudit(auditLog, { type: "auth.logout", actorId: session.userId });
      }
      sessions.delete(sessionId);
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get("/api/me", async (request) => {
    const { userId } = requireSession(request);
    return { userId, hasSession: true };
  });

  app.get("/api/chats", async (request) => {
    const { userId } = requireSession(request);
    return [...chatsById.values()].filter((chat) => (chat.memberIds || []).includes(userId));
  });

  app.get("/api/users", async (request) => {
    requireSession(request);
    const q = String(request.query?.q || "").trim().toLowerCase();
    const users = [...registeredUsers.values()].filter((id) => (q ? id.includes(q) : true));
    return users.slice(0, 50).map((id) => ({ userId: id }));
  });

  app.post("/api/dms", async (request) => {
    const { userId } = requireSession(request);
    const body = parseRequestBody(request);
    const peerId = normalizeUserId(body.peerId || "");
    if (peerId === userId) throw httpError(400, "Cannot DM yourself");
    if (!registeredUsers.has(peerId)) throw httpError(404, "User not found");

    const members = [userId, peerId].sort();
    const dmId = `dm-${members[0]}-${members[1]}`;
    const existing = chatsById.get(dmId);
    if (existing) return existing;

    const dmChat = {
      id: dmId,
      type: "direct",
      name: `${members[0]} & ${members[1]}`,
      memberIds: members,
      createdBy: userId,
      createdAt: now(),
      updatedAt: now()
    };
    chatsById.set(dmId, dmChat);
    return dmChat;
  });

  app.post("/api/messages", async (request) => {
    const { userId } = requireSession(request);
    const body = parseRequestBody(request);
    const chatId = String(body.chatId || "global");
    const chat = requireChat(chatId, userId);

    cleanupExpiredIdempotency();
    const idempotencyKey = getIdempotencyKey(request, body);
    if (idempotencyKey) {
      const key = `${userId}:${idempotencyKey}`;
      const existing = idempotentMessages.get(key);
      if (existing) {
        return { ...existing.message, idempotentReplay: true };
      }
    }

    const message = sendMessagePrivileged({
      senderId: userId,
      chat,
      text: body.text,
      blocks,
      countPerMinute: getCountPerMinute(userId)
    });

    messages.unshift(message);

    if (idempotencyKey) {
      idempotentMessages.set(`${userId}:${idempotencyKey}`, {
        message,
        createdAt: now()
      });
    }

    return message;
  });

  app.get("/api/messages", async (request) => {
    const { userId } = requireSession(request);
    const chatId = String(request.query?.chatId || "global");
    requireChat(chatId, userId);

    const limit = Math.min(parsePositiveInteger(request.query?.limit, 50), MAX_MESSAGE_PAGE_SIZE);
    const before = parseTimestamp(request.query?.before);

    const source = messages.filter((m) => m.chatId === chatId);
    const filtered = before ? source.filter((m) => m.createdAt < before) : source;
    const items = filtered.slice(0, limit);

    const hasMore = filtered.length > limit;
    const nextBefore = hasMore && items.length ? items[items.length - 1].createdAt : null;

    const wantsV2 =
      request.query?.v === "2" ||
      request.query?.limit !== undefined ||
      request.query?.before !== undefined;

    if (wantsV2) {
      return { items, hasMore, nextBefore };
    }

    return items;
  });

  app.post("/api/friends/request", async (request) => {
    const { userId } = requireSession(request);
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
    const { userId } = requireSession(request);
    const body = parseRequestBody(request);
    const record = blockUser({
      blockerId: userId,
      blockedId: String(body.blockedId || "").trim()
    });
    blocks.unshift(record);
    return record;
  });

  app.post("/api/channels", async (request) => {
    const { userId } = requireSession(request);
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
    const { userId } = requireSession(request);
    const body = parseRequestBody(request);
    const message = messages.find((m) => m.id === body.messageId);
    if (!message) throw httpError(404, "Message not found");
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
    const { userId } = requireSession(request);
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

  app.get("/api/read-receipts", async (request) => {
    const { userId } = requireSession(request);
    const chatId = String(request.query?.chatId || "global");
    requireChat(chatId, userId);
    const messageId = String(request.query?.messageId || "").trim();

    return readReceipts
      .filter((r) => r.chatId === chatId)
      .filter((r) => !messageId || r.messageId === messageId)
      .slice(0, 200);
  });

  app.post("/api/presence", async (request) => {
    const { userId } = requireSession(request);
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
    const { userId } = requireSession(request);
    const body = parseRequestBody(request);
    const reportId = String(request.params?.reportId || "");
    const report = moderationReports.find((r) => r.id === reportId);
    if (!report) throw httpError(404, "Report not found");

    const resolved = moderateMessage({
      actorId: userId,
      actorRole: String(body.actorRole || "owner"),
      report,
      action: String(body.action || "")
    });

    const index = moderationReports.findIndex((r) => r.id === reportId);
    moderationReports[index] = resolved;
    withAudit(auditLog, {
      type: "moderation.resolve",
      actorId: userId,
      reportId,
      action: resolved.action
    });
    return resolved;
  });

  app.get("/api/moderation", async (request) => {
    requireSession(request);
    return moderationReports;
  });

  app.get("/api/search", async (request) => {
    const { userId } = requireSession(request);
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

  app.get("/api/sync", async (request) => {
    const { userId } = requireSession(request);
    const chatId = String(request.query?.chatId || "global");
    requireChat(chatId, userId);
    return {
      ok: true,
      serverTime: now(),
      messages: messages.filter((m) => m.chatId === chatId).slice(0, 50),
      presence: [...presenceByUser.values()].slice(0, 200),
      receipts: readReceipts.filter((r) => r.chatId === chatId).slice(0, 200)
    };
  });

  app.get("/api/audit", async (request) => {
    requireSession(request);
    return auditLog.slice(0, 200);
  });

  app.get("/api/announcements", async (request) => {
    requireSession(request);
    return { announcements, updateLogs };
  });

  const wsClients = new Map();
  const wsByUser = new Map();

  function sendToUser(targetId, payload) {
    const clients = wsByUser.get(targetId);
    if (!clients) return;
    const encoded = JSON.stringify(payload);
    clients.forEach((client) => {
      if (client.readyState === 1) client.send(encoded);
    });
  }

  app.get("/ws", { websocket: true }, (socket, request) => {
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    const session = sessions.get(sessionId);
    if (!session || session.expiresAt <= now()) {
      socket.close(1008, "Unauthorized");
      return;
    }

    const userId = session.userId;
    ensureGlobalMembership(userId);
    wsClients.set(socket, userId);
    if (!wsByUser.has(userId)) wsByUser.set(userId, new Set());
    wsByUser.get(userId).add(socket);
    socket.send(JSON.stringify({ type: "welcome", userId }));

    socket.on("message", (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (payload?.type === "chat") {
        const text = String(payload?.text || "").trim();
        if (!text || text.length > 500) return;
        const event = { type: "chat", id: createId("ws"), userId, text, createdAt: now() };
        const encoded = JSON.stringify(event);
        wsClients.forEach((_uid, client) => {
          if (client.readyState === 1) client.send(encoded);
        });
        return;
      }

      const type = String(payload?.type || "").trim();
      const targetId = String(payload?.targetId || "").trim().toLowerCase();
      const allowedSignalEvents = new Set([
        "call-request",
        "call-accept",
        "call-decline",
        "webrtc-offer",
        "webrtc-answer",
        "webrtc-ice",
        "call-end"
      ]);

      if (!allowedSignalEvents.has(type) || !targetId || targetId === userId || !registeredUsers.has(targetId)) return;

      const chatId = String(payload?.chatId || "").trim();
      const chat = chatsById.get(chatId);
      if (!chat || !chat.memberIds.includes(userId) || !chat.memberIds.includes(targetId)) return;

      sendToUser(targetId, {
        type,
        fromUserId: userId,
        targetId,
        chatId,
        data: payload?.data || null,
        createdAt: now()
      });
    });

    socket.on("close", () => {
      wsClients.delete(socket);
      const sockets = wsByUser.get(userId);
      if (sockets) {
        sockets.delete(socket);
        if (!sockets.size) {
          wsByUser.delete(userId);
        }
      }
    });
  });

  // SPA fallback: serve index.html for all non-API, non-WS GET requests
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/") || request.url.startsWith("/ws")) {
      reply.code(404).send({ ok: false, error: "Not found" });
      return;
    }
    reply.sendFile("index.html");
  });

  return { app, config, runtimeValidation };
}

export async function startServer({ env = process.env } = {}) {
  const { app, config } = await createApp({ env });
  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await startServer({ env: process.env });
}
