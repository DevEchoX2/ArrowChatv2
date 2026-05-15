import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderPresence(state) {
  const rows = state.presence
    .map(
      (p) => `<div class="card">
        <div class="row"><strong>${sanitizeText(p.name)}</strong><span class="badge">${sanitizeText(p.status)}</span></div>
        <div class="subtle">${p.typingIn ? `Typing in ${sanitizeText(p.typingIn)}` : "Not typing"}</div>
      </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Presence & Typing</h2></div>
    <div class="card"><span class="subtle">Phase 2 live presence and typing indicators.</span></div>
    <div class="list">${rows || '<div class="card">No presence data yet.</div>'}</div>
  `;
}
