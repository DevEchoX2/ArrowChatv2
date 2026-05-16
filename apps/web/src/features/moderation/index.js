import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderModeration(state) {
  const rows = state.moderationQueue
    .map(
      (m) => `<div class="card">
        <div class="row"><strong>${sanitizeText(m.messageId)}</strong><span class="badge">${sanitizeText(m.status)}</span></div>
        <div class="subtle">Reason: ${sanitizeText(m.reason)} | Reporter: ${sanitizeText(m.reporter)}</div>
      </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Moderation Tools</h2></div>
    <div class="card"><span class="subtle">Phase 2 admin queue and moderation actions.</span></div>
    <div class="list">${rows || '<div class="card">No moderation events.</div>'}</div>
  `;
}
