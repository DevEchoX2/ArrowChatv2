import { NAV_ITEMS } from "../../../shared/constants/navigation.js";
import { getState, setState } from "./core/state.js";
import { getFirebaseStatus } from "./core/firebase.js";
import { renderGlobalChat, bindGlobalChatHandlers } from "./features/global-chat/index.js";
import { renderDMs } from "./features/dm/index.js";
import { renderGroupChannels } from "./features/group-channels/index.js";
import { renderReactions } from "./features/reactions/index.js";
import { renderReadReceipts } from "./features/read-receipts/index.js";
import { renderModeration } from "./features/moderation/index.js";
import { renderSearch } from "./features/search/index.js";
import { renderPresence } from "./features/presence/index.js";
import { renderNotifications } from "./features/notifications/index.js";
import { renderFriends } from "./features/friends/index.js";
import { renderBlockedUsers, bindBlockedHandlers } from "./features/blocked-users/index.js";
import { renderSettings } from "./features/settings/index.js";
import { bindMediaUpload } from "./features/media/index.js";
import { sanitizeText } from "../../../shared/utils/sanitize.js";

const app = document.getElementById("app");

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toSafeBackgroundUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function navMarkup(activeView) {
  return NAV_ITEMS.map(
    (item) => `<button data-nav="${item.key}" class="${activeView === item.key ? "active" : ""}">
      <i data-lucide="${item.icon}"></i><span>${item.label}</span>
    </button>`
  ).join("");
}

function renderCenter(state, firebaseStatus) {
  switch (state.activeView) {
    case "global":
      return renderGlobalChat(state);
    case "dms":
      return renderDMs(state);
    case "channels":
      return renderGroupChannels(state);
    case "reactions":
      return renderReactions(state);
    case "receipts":
      return renderReadReceipts(state);
    case "moderation":
      return renderModeration(state);
    case "search":
      return renderSearch(state);
    case "presence":
      return renderPresence(state);
    case "notifications":
      return renderNotifications(state);
    case "friends":
      return renderFriends(state);
    case "blocked":
      return renderBlockedUsers(state);
    case "settings":
      return renderSettings(state, firebaseStatus);
    default:
      return '<div class="card">Unknown view</div>';
  }
}

function renderRight(state) {
  return `
    <div class="header-row"><h3>Context</h3></div>
    <div class="card">
      <div><strong>${sanitizeText(state.currentUser.displayName)}</strong></div>
      <div class="subtle">${sanitizeText(state.currentUser.email)}</div>
    </div>
    <div class="card">
      <div><strong>Media Upload</strong></div>
      <input id="media-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      <div id="media-status" class="subtle">No file selected</div>
      <img id="media-preview" class="preview hidden" alt="Media preview" />
    </div>
    <div class="card">
      <div><strong>Policy</strong></div>
      <div class="subtle">Membership checks are field-based and server-enforced (never by document ID patterns).</div>
    </div>
  `;
}

function paintBackground(bgUrl) {
  const safeUrl = toSafeBackgroundUrl(bgUrl);
  document.body.style.backgroundImage = safeUrl
    ? `linear-gradient(130deg, rgba(240,244,250,0.92), rgba(38,51,72,0.45)), url("${safeUrl}")`
    : "linear-gradient(125deg, #eef1f5 0%, #dfe5ee 60%, #aab4c4 100%)";
  document.body.style.backgroundSize = safeUrl ? "cover" : "auto";
}

function render() {
  const state = getState();
  const firebaseStatus = getFirebaseStatus();
  paintBackground(state.preferences.globalBg);

  app.innerHTML = `
    <aside class="panel nav">
      <div class="brand">Private Workspace</div>
      ${navMarkup(state.activeView)}
    </aside>
    <main class="panel center">${renderCenter(state, firebaseStatus)}</main>
    <section class="panel right">${renderRight(state)}</section>
  `;

  app.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ activeView: button.getAttribute("data-nav") });
      render();
    });
  });

  if (state.activeView === "global") {
    bindGlobalChatHandlers(app, {
      onSend(text) {
        const clean = sanitizeText(text);
        if (!clean) return;
        const next = [{ id: createId(), sender: "You", text: clean, pinned: false }, ...state.globalMessages];
        setState({ globalMessages: next });
        render();
      },
      onBgChange(bg) {
        setState({ preferences: { ...state.preferences, globalBg: sanitizeText(bg) } });
        render();
      },
      onPin() {
        if (!state.globalMessages.length) return;
        const next = state.globalMessages.map((msg, i) => ({ ...msg, pinned: i === 0 }));
        setState({ globalMessages: next });
        render();
      }
    });
  }

  if (state.activeView === "blocked") {
    bindBlockedHandlers(app, {
      onBlock(name) {
        const clean = sanitizeText(name);
        if (!clean) return;
        const exists = state.blocked.some((u) => u.name.toLowerCase() === clean.toLowerCase());
        if (exists) return;

        setState({
          blocked: [{ id: createId(), name: clean }, ...state.blocked],
          friends: state.friends.filter((f) => f.name.toLowerCase() !== clean.toLowerCase())
        });

        setState({
          notifications: [
            {
              id: createId(),
              type: "moderation",
              text: `Blocked ${clean}`,
              read: false
            },
            ...getState().notifications
          ]
        });

        render();
      }
    });
  }

  bindMediaUpload(app, (file) => {
    setState({
      notifications: [
        {
          id: createId(),
          type: "media",
          text: `Media selected: ${file.name}`,
          read: false
        },
        ...getState().notifications
      ]
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

render();
