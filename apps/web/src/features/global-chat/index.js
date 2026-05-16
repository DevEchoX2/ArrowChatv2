import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderGlobalChat(state) {
  const list = state.globalMessages
    .map(
      (m) => `<div class="card">
        <div class="row"><strong>${sanitizeText(m.sender)}</strong>${m.pinned ? '<span class="badge">Pinned</span>' : ""}</div>
        <div>${sanitizeText(m.text)}</div>
      </div>`
    )
    .join("");

  return `
    <div class="header-row">
      <h2>Lobby</h2>
      <button data-action="pin-latest">Pin Latest</button>
    </div>
    <div class="card">
      <label class="subtle">Personal background URL (only for you)</label>
      <input id="global-bg" value="${sanitizeText(state.preferences.globalBg || "")}" placeholder="https://..." />
      <div class="row" style="margin-top:8px;"><button data-action="save-bg">Save Background</button></div>
    </div>
    <div class="list">${list}</div>
    <div class="card">
      <textarea id="global-message" placeholder="Send a lobby message..."></textarea>
      <div class="row" style="margin-top:8px;"><button class="primary" data-action="send-global">Send</button></div>
    </div>
  `;
}

export function bindGlobalChatHandlers(root, handlers) {
  root.querySelector('[data-action="send-global"]')?.addEventListener("click", () => {
    const text = root.querySelector("#global-message")?.value || "";
    handlers.onSend(text);
  });

  root.querySelector('[data-action="save-bg"]')?.addEventListener("click", () => {
    const bg = root.querySelector("#global-bg")?.value || "";
    handlers.onBgChange(bg);
  });

  root.querySelector('[data-action="pin-latest"]')?.addEventListener("click", () => {
    handlers.onPin();
  });
}
