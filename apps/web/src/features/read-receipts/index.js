import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderReadReceipts(state) {
  const rows = state.readReceipts
    .map(
      (r) => `<div class="card">
        <div><strong>${sanitizeText(r.messageId)}</strong></div>
        <div class="subtle">User ${sanitizeText(r.userId)} read at ${new Date(r.readAt).toLocaleString()}</div>
      </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Read Receipts</h2></div>
    <div class="card"><span class="subtle">Phase 2 delivery/read timeline view.</span></div>
    <div class="list">${rows || '<div class="card">No receipts yet.</div>'}</div>
  `;
}
