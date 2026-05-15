import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderBlockedUsers(state, onBlock) {
  const rows = state.blocked
    .map((u) => `<div class="card"><strong>${sanitizeText(u.name)}</strong></div>`)
    .join("");

  return `
    <div class="header-row"><h2>Blocked Users</h2></div>
    <div class="card">
      <input id="block-name" placeholder="User to block" />
      <div class="row" style="margin-top:8px;"><button data-action="block-user">Block</button></div>
    </div>
    <div class="list">${rows || '<div class="card">No blocked users.</div>'}</div>
  `;
}

export function bindBlockedHandlers(root, handlers) {
  root.querySelector('[data-action="block-user"]')?.addEventListener("click", () => {
    const name = root.querySelector("#block-name")?.value || "";
    handlers.onBlock(name);
  });
}
