import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderGroupChannels(state) {
  const rows = state.channels
    .map(
      (c) => `<div class="card">
        <div class="row"><strong># ${sanitizeText(c.name)}</strong><span class="badge">Members ${c.memberCount}</span><span class="badge">Unread ${c.unread}</span></div>
      </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Group Channels</h2></div>
    <div class="card">
      <label class="subtle">Phase 2: channel hierarchy and category management.</label>
    </div>
    <div class="list">${rows || '<div class="card">No channels yet.</div>'}</div>
  `;
}
