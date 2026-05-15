import { NAV_ITEMS } from "../../../shared/constants/navigation.js";
import { getState, setState } from "./core/state.js";
import { getFirebaseStatus } from "./core/firebase.js";
import { renderGlobalChat, bindGlobalChatHandlers } from "./features/global-chat/index.js";
import { renderDMs } from "./features/dm/index.js";
import { renderNotifications } from "./features/notifications/index.js";
import { renderFriends } from "./features/friends/index.js";
import { renderBlockedUsers, bindBlockedHandlers } from "./features/blocked-users/index.js";
import { renderSettings } from "./features/settings/index.js";
import { bindMediaUpload } from "./features/media/index.js";
import { sanitizeText } from "../../../shared/utils/sanitize.js";

const app = document.getElementById("app");

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
      <div class="subtle">Friends and blocked-user checks should be server-enforced.</div>
    </div>
  `;
}

function paintBackground(bgUrl) {
  document.body.style.backgroundImage = bgUrl
    ? `linear-gradient(135deg, rgba(255,255,255,0.94), rgba(10,10,10,0.4)), url('${encodeURI(bgUrl)}')`
    : "linear-gradient(135deg, #fff 0%, #f5f5f5 55%, #111 100%)";
  document.body.style.backgroundSize = bgUrl ? "cover" : "auto";
}

function render() {
  const state = getState();
  const firebaseStatus = getFirebaseStatus();
  paintBackground(state.preferences.globalBg);

  app.innerHTML = `
    <aside class="panel nav">
      <div class="brand">ArrowChat v2</div>
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
        const next = [{ id: crypto.randomUUID(), sender: "You", text: clean, pinned: false }, ...state.globalMessages];
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
          blocked: [{ id: crypto.randomUUID(), name: clean }, ...state.blocked],
          friends: state.friends.filter((f) => f.name.toLowerCase() !== clean.toLowerCase())
        });

        setState({
          notifications: [
            {
              id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
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
