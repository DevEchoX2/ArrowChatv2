import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderReactions(state) {
  const rows = state.reactions
    .map(
      (r) => `<div class="card row">
        <span class="badge">${sanitizeText(r.emoji)}</span>
        <strong>${sanitizeText(r.messageId)}</strong>
        <span class="subtle">Count ${sanitizeText(r.count)}</span>
      </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Message Reactions</h2></div>
    <div class="card"><span class="subtle">Phase 2 reaction analytics and moderation surfaces.</span></div>
    <div class="list">${rows || '<div class="card">No reactions yet.</div>'}</div>
  `;
}
