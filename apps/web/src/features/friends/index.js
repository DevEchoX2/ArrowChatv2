import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderFriends(state) {
  const rows = state.friends
    .map(
      (f) => `<div class="card row">
      <strong>${sanitizeText(f.name)}</strong>
      <span class="badge">${sanitizeText(f.status)}</span>
    </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Friends</h2></div>
    <div class="list">${rows || '<div class="card">No friends yet.</div>'}</div>
  `;
}
