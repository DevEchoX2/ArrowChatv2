import { sanitizeText } from "../../../shared/utils/sanitize.js";
import { getApiBaseUrl } from "./core/config.js";

const app = document.getElementById("app");

const state = {
  userId: "",
  activeView: "announcements",
  announcements: [],
  updateLogs: [],
  globalMessages: [],
  dmChats: [],
  selectedChatId: "",
  dmMessages: [],
  users: [],
  friends: [],
  blocked: [],
  incomingCall: null,
  callStatus: "",
  ws: null,
  peer: null,
  localStream: null,
  remoteStream: null,
  outgoingCallIntent: null
};

const NAV = [
  { key: "announcements", label: "Announcements" },
  { key: "updates", label: "Update Logs" },
  { key: "global", label: "Global Chat" },
  { key: "dms", label: "DMs" },
  { key: "friends", label: "Friends" },
  { key: "blocked", label: "Blocked Users" }
];

function wsUrl() {
  const apiBase = getApiBaseUrl();
  if (apiBase) {
    try {
      const parsed = new URL(apiBase, window.location.origin);
      const proto = parsed.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${parsed.host}/ws`;
    } catch (_error) {
      // Invalid apiBase config falls back to same-origin ws URL.
    }
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

function withApiBase(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
}

async function api(path, options = {}) {
  const response = await fetch(withApiBase(path), {
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function renderLogin(error = "", mode = "signin") {
  const isSignUp = mode === "signup";
  app.classList.add("auth-mode");
  app.innerHTML = `
    <div class="login-shell">
      <div class="panel login-panel">
        <h1>ArrowChat</h1>
        <div class="row auth-mode-toggle">
          <button class="${isSignUp ? "" : "primary"}" id="signin-tab">Sign In</button>
          <button class="${isSignUp ? "primary" : ""}" id="signup-tab">Sign Up</button>
        </div>
        <p class="subtle">${isSignUp ? "Create your account to enter chat." : "Sign in to your existing account."}</p>
        <input id="username" placeholder="username (a-z, 0-9, _, -)" />
        <input id="password" type="password" placeholder="access password" />
        <button class="primary" id="login-btn">${isSignUp ? "Create Account" : "Sign In"}</button>
        <div class="error">${sanitizeText(error)}</div>
      </div>
    </div>
  `;

  app.querySelector("#signin-tab")?.addEventListener("click", () => renderLogin("", "signin"));
  app.querySelector("#signup-tab")?.addEventListener("click", () => renderLogin("", "signup"));
  app.querySelector("#login-btn")?.addEventListener("click", async () => {
    const userId = String(app.querySelector("#username")?.value || "").trim().toLowerCase();
    const password = String(app.querySelector("#password")?.value || "");
    try {
      await api(isSignUp ? "/api/auth/signup" : "/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ userId, password })
      });
      await bootApp();
    } catch (err) {
      renderLogin(String(err.message || (isSignUp ? "Sign up failed" : "Sign in failed")), mode);
    }
  });
}

function renderShell() {
  app.classList.remove("auth-mode");
  app.innerHTML = `
    <aside class="panel nav">
      <div class="brand">ArrowChat</div>
      <div class="subtle">@${sanitizeText(state.userId)}</div>
      ${NAV.map(
        (item) =>
          `<button data-nav="${item.key}" class="${state.activeView === item.key ? "active" : ""}">${sanitizeText(item.label)}</button>`
      ).join("")}
      <button id="logout">Logout</button>
    </aside>
    <main class="panel center">${renderCenter()}</main>
    <section class="panel right">${renderRight()}</section>
  `;

  app.querySelectorAll("[data-nav]").forEach((node) => {
    node.addEventListener("click", () => {
      state.activeView = node.getAttribute("data-nav") || "announcements";
      renderShell();
    });
  });

  app.querySelector("#logout")?.addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
    } finally {
      teardownCall();
      state.ws?.close();
      state.ws = null;
      renderLogin();
    }
  });

  bindViewHandlers();
}

function renderCenter() {
  if (state.activeView === "announcements") {
    return `
      <div class="header-row"><h2>Announcements</h2></div>
      <div class="list">
        ${state.announcements
          .map((a) => `<div class="card"><strong>${sanitizeText(a.title)}</strong><div>${sanitizeText(a.body)}</div></div>`)
          .join("")}
      </div>
    `;
  }

  if (state.activeView === "updates") {
    return `
      <div class="header-row"><h2>Update Logs</h2></div>
      <div class="list">
        ${state.updateLogs.map((u) => `<div class="card">${sanitizeText(u.body)}</div>`).join("")}
      </div>
    `;
  }

  if (state.activeView === "global") {
    return `
      <div class="header-row"><h2>Global Chat</h2></div>
      <div class="list">
        ${state.globalMessages
          .map(
            (m) => `<div class="card"><div class="subtle">${sanitizeText(m.senderId)}</div><div>${sanitizeText(m.text)}</div></div>`
          )
          .join("")}
      </div>
      <div class="row compose-row">
        <input id="global-message" placeholder="Write message" />
        <button class="primary" id="send-global">Send</button>
      </div>
    `;
  }

  if (state.activeView === "dms") {
    const rows = state.dmChats
      .map((chat) => {
        const peer = chat.memberIds.find((id) => id !== state.userId) || "unknown";
        const selected = chat.id === state.selectedChatId ? "active" : "";
        return `<button class="dm-item ${selected}" data-chat-id="${sanitizeText(chat.id)}">${sanitizeText(peer)}</button>`;
      })
      .join("");

    return `
      <div class="header-row"><h2>Direct Messages</h2></div>
      <div class="row split">
        <div class="dm-list">
          <div class="card">
            <input id="dm-target" placeholder="username to DM" />
            <button id="open-dm">Open DM</button>
          </div>
          ${rows || '<div class="card">No DMs yet.</div>'}
        </div>
        <div class="dm-chat">
          <div class="call-row">
            <button id="call-audio">Start Audio Call</button>
            <button id="call-video">Start Video Call</button>
            <button id="end-call">End Call</button>
          </div>
          <div class="list">
            ${state.dmMessages
              .map(
                (m) => `<div class="card"><div class="subtle">${sanitizeText(m.senderId)}</div><div>${sanitizeText(m.text)}</div></div>`
              )
              .join("")}
          </div>
          <div class="row compose-row">
            <input id="dm-message" placeholder="Message DM" />
            <button class="primary" id="send-dm">Send</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.activeView === "friends") {
    return `
      <div class="header-row"><h2>Friends</h2></div>
      <div class="card row">
        <input id="friend-target" placeholder="username to add" />
        <button id="add-friend">Send Request</button>
      </div>
      <div class="list">${state.friends
        .map((f) => `<div class="card"><strong>${sanitizeText(f.friendId)}</strong><div class="subtle">${sanitizeText(f.status)}</div></div>`)
        .join("")}</div>
    `;
  }

  return `
    <div class="header-row"><h2>Blocked Users</h2></div>
    <div class="card row">
      <input id="block-target" placeholder="username to block" />
      <button id="add-block">Block</button>
    </div>
    <div class="list">${state.blocked.map((b) => `<div class="card">${sanitizeText(b.blockedId)}</div>`).join("")}</div>
  `;
}

function renderRight() {
  const users = state.users.map((u) => `<span class="badge">${sanitizeText(u.userId)}</span>`).join(" ");
  const incoming = state.incomingCall
    ? `<div class="card">
      <div><strong>Incoming ${sanitizeText(state.incomingCall.mode)} call</strong></div>
      <div class="subtle">From: ${sanitizeText(state.incomingCall.fromUserId)}</div>
      <div class="row"><button id="accept-call">Accept</button><button id="decline-call">Decline</button></div>
    </div>`
    : "";

  return `
    <div class="header-row"><h3>Workspace</h3></div>
    <div class="card"><strong>Available users</strong><div>${users || '<span class="subtle">No users yet</span>'}</div></div>
    ${incoming}
    <div class="card"><strong>Call status</strong><div class="subtle">${sanitizeText(state.callStatus || "idle")}</div></div>
    <div class="card">
      <strong>Local Preview</strong>
      <video id="local-video" autoplay muted playsinline></video>
    </div>
    <div class="card">
      <strong>Remote Stream</strong>
      <video id="remote-video" autoplay playsinline></video>
    </div>
  `;
}

function selectedPeer() {
  const chat = state.dmChats.find((c) => c.id === state.selectedChatId);
  if (!chat) return "";
  return chat.memberIds.find((id) => id !== state.userId) || "";
}

function sendSignal(type, targetId, chatId, data = null) {
  if (!state.ws || state.ws.readyState !== 1) return;
  state.ws.send(JSON.stringify({ type, targetId, chatId, data }));
}

async function ensurePeerConnection(targetId, chatId, mode) {
  if (state.peer) return state.peer;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
  state.localStream = stream;

  const peer = new RTCPeerConnection({
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
  });

  stream.getTracks().forEach((track) => peer.addTrack(track, stream));

  peer.onicecandidate = (event) => {
    if (!event.candidate) return;
    sendSignal("webrtc-ice", targetId, chatId, { candidate: event.candidate });
  };

  peer.ontrack = (event) => {
    const [remote] = event.streams;
    state.remoteStream = remote;
    attachMedia();
  };

  state.peer = peer;
  attachMedia();
  return peer;
}

function attachMedia() {
  const localVideo = app.querySelector("#local-video");
  const remoteVideo = app.querySelector("#remote-video");
  if (localVideo) localVideo.srcObject = state.localStream || null;
  if (remoteVideo) remoteVideo.srcObject = state.remoteStream || null;
}

function teardownCall() {
  if (state.peer) {
    state.peer.ontrack = null;
    state.peer.onicecandidate = null;
    state.peer.close();
  }
  if (state.localStream) {
    state.localStream.getTracks().forEach((t) => t.stop());
  }
  state.peer = null;
  state.localStream = null;
  state.remoteStream = null;
  state.outgoingCallIntent = null;
}

async function handleSignal(payload) {
  const type = String(payload?.type || "");

  if (type === "call-request") {
    state.incomingCall = {
      fromUserId: payload.fromUserId,
      chatId: payload.chatId,
      mode: payload?.data?.mode || "audio"
    };
    state.callStatus = `Incoming ${state.incomingCall.mode} call`;
    renderShell();
    return;
  }

  if (type === "call-decline") {
    teardownCall();
    state.callStatus = "Call declined";
    renderShell();
    return;
  }

  if (type === "call-accept") {
    const intent = state.outgoingCallIntent;
    if (!intent) return;
    const peer = await ensurePeerConnection(intent.targetId, intent.chatId, intent.mode);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSignal("webrtc-offer", intent.targetId, intent.chatId, { sdp: offer, mode: intent.mode });
    state.callStatus = `Calling ${intent.targetId}`;
    renderShell();
    return;
  }

  if (type === "webrtc-offer") {
    const targetId = payload.fromUserId;
    const chatId = payload.chatId;
    const mode = payload?.data?.mode || "audio";
    const peer = await ensurePeerConnection(targetId, chatId, mode);
    await peer.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    sendSignal("webrtc-answer", targetId, chatId, { sdp: answer });
    state.callStatus = `In call with ${targetId}`;
    renderShell();
    return;
  }

  if (type === "webrtc-answer") {
    if (!state.peer) return;
    await state.peer.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
    state.callStatus = `In call with ${payload.fromUserId}`;
    renderShell();
    return;
  }

  if (type === "webrtc-ice") {
    if (!state.peer || !payload?.data?.candidate) return;
    await state.peer.addIceCandidate(new RTCIceCandidate(payload.data.candidate));
    return;
  }

  if (type === "call-end") {
    teardownCall();
    state.callStatus = `Call ended by ${payload.fromUserId}`;
    renderShell();
  }
}

function bindViewHandlers() {
  if (state.activeView === "global") {
    app.querySelector("#send-global")?.addEventListener("click", async () => {
      const text = String(app.querySelector("#global-message")?.value || "").trim();
      if (!text) return;
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({ chatId: "global", text })
      });
      await refreshGlobalMessages();
      renderShell();
    });
  }

  if (state.activeView === "dms") {
    app.querySelectorAll("[data-chat-id]").forEach((node) => {
      node.addEventListener("click", async () => {
        state.selectedChatId = node.getAttribute("data-chat-id") || "";
        await refreshDMMessages();
        renderShell();
      });
    });

    app.querySelector("#open-dm")?.addEventListener("click", async () => {
      const peerId = String(app.querySelector("#dm-target")?.value || "").trim().toLowerCase();
      if (!peerId) return;
      await api("/api/dms", { method: "POST", body: JSON.stringify({ peerId }) });
      await refreshChats();
      state.selectedChatId = state.dmChats.find((c) => c.memberIds.includes(peerId))?.id || state.selectedChatId;
      await refreshDMMessages();
      renderShell();
    });

    app.querySelector("#send-dm")?.addEventListener("click", async () => {
      if (!state.selectedChatId) return;
      const text = String(app.querySelector("#dm-message")?.value || "").trim();
      if (!text) return;
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({ chatId: state.selectedChatId, text })
      });
      await refreshDMMessages();
      renderShell();
    });

    app.querySelector("#call-audio")?.addEventListener("click", async () => {
      const peerId = selectedPeer();
      if (!peerId || !state.selectedChatId) return;
      state.outgoingCallIntent = { targetId: peerId, chatId: state.selectedChatId, mode: "audio" };
      state.callStatus = `Calling ${peerId} (audio request sent)`;
      sendSignal("call-request", peerId, state.selectedChatId, { mode: "audio" });
      renderShell();
    });

    app.querySelector("#call-video")?.addEventListener("click", async () => {
      const peerId = selectedPeer();
      if (!peerId || !state.selectedChatId) return;
      state.outgoingCallIntent = { targetId: peerId, chatId: state.selectedChatId, mode: "video" };
      state.callStatus = `Calling ${peerId} (video request sent)`;
      sendSignal("call-request", peerId, state.selectedChatId, { mode: "video" });
      renderShell();
    });

    app.querySelector("#end-call")?.addEventListener("click", () => {
      const peerId = selectedPeer();
      if (peerId && state.selectedChatId) {
        sendSignal("call-end", peerId, state.selectedChatId, null);
      }
      teardownCall();
      state.callStatus = "Call ended";
      renderShell();
    });
  }

  if (state.activeView === "friends") {
    app.querySelector("#add-friend")?.addEventListener("click", async () => {
      const targetId = String(app.querySelector("#friend-target")?.value || "").trim().toLowerCase();
      if (!targetId) return;
      const relation = await api("/api/friends/request", {
        method: "POST",
        body: JSON.stringify({ targetId })
      });
      state.friends = [relation, ...state.friends];
      renderShell();
    });
  }

  if (state.activeView === "blocked") {
    app.querySelector("#add-block")?.addEventListener("click", async () => {
      const blockedId = String(app.querySelector("#block-target")?.value || "").trim().toLowerCase();
      if (!blockedId) return;
      const record = await api("/api/blocks", {
        method: "POST",
        body: JSON.stringify({ blockedId })
      });
      state.blocked = [record, ...state.blocked.filter((b) => b.blockedId !== blockedId)];
      renderShell();
    });
  }

  app.querySelector("#accept-call")?.addEventListener("click", () => {
    if (!state.incomingCall) return;
    const { fromUserId, chatId } = state.incomingCall;
    sendSignal("call-accept", fromUserId, chatId, null);
    state.callStatus = `Accepted call from ${fromUserId}`;
    state.incomingCall = null;
    renderShell();
  });

  app.querySelector("#decline-call")?.addEventListener("click", () => {
    if (!state.incomingCall) return;
    sendSignal("call-decline", state.incomingCall.fromUserId, state.incomingCall.chatId, null);
    state.callStatus = "Call declined";
    state.incomingCall = null;
    renderShell();
  });

  attachMedia();
}

async function refreshGlobalMessages() {
  const data = await api("/api/messages?v=2&limit=50&chatId=global");
  state.globalMessages = data.items || [];
}

async function refreshChats() {
  const chats = await api("/api/chats");
  state.dmChats = chats.filter((chat) => chat.type === "direct");
  if (!state.selectedChatId && state.dmChats[0]) {
    state.selectedChatId = state.dmChats[0].id;
  }
}

async function refreshDMMessages() {
  if (!state.selectedChatId) {
    state.dmMessages = [];
    return;
  }
  const data = await api(`/api/messages?v=2&limit=50&chatId=${encodeURIComponent(state.selectedChatId)}`);
  state.dmMessages = data.items || [];
}

async function refreshAuxData() {
  const info = await api("/api/announcements");
  state.announcements = info.announcements || [];
  state.updateLogs = info.updateLogs || [];
  state.users = await api("/api/users");
}

function connectSocket() {
  state.ws?.close();
  state.ws = new WebSocket(wsUrl());
  state.ws.addEventListener("message", async (event) => {
    let payload;
    try {
      payload = JSON.parse(String(event.data || ""));
    } catch {
      return;
    }

    if (payload?.type === "chat") {
      if (state.activeView === "global") {
        await refreshGlobalMessages();
      }
      renderShell();
      return;
    }

    await handleSignal(payload);
  });
}

async function bootApp() {
  const me = await api("/api/me");
  state.userId = me.userId;
  await Promise.all([refreshAuxData(), refreshGlobalMessages(), refreshChats()]);
  await refreshDMMessages();
  connectSocket();
  renderShell();
}

(async () => {
  try {
    await bootApp();
  } catch {
    renderLogin();
  }
})();
