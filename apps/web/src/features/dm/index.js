import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderDMs(state) {
  const typingUsers = state.presence
    .filter((p) => p.typingIn && p.typingIn.startsWith("d"))
    .map((p) => p.name)
    .join(", ");

  const rows = state.dms
    .map(
      (dm) => `<div class="card">
        <div class="row"><strong>${sanitizeText(dm.user)}</strong><span class="badge">Unread ${dm.unread}</span></div>
        <div class="subtle">Last: ${sanitizeText(dm.messages.at(-1)?.text || "")}</div>
        <div class="subtle">Media: supported</div>
      </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Direct Messages</h2></div>
    <div class="card"><span class="subtle">Typing: ${sanitizeText(typingUsers || "none")}</span></div>
    <div class="list">${rows || '<div class="card">No DMs yet.</div>'}</div>
  `;
}
