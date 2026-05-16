import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderNotifications(state) {
  const rows = state.notifications
    .map(
      (n) => `<div class="card">
      <div class="row"><strong>${sanitizeText(n.type)}</strong>${n.read ? "" : '<span class="badge">New</span>'}</div>
      <div>${sanitizeText(n.text)}</div>
    </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Notifications</h2></div>
    <div class="list">${rows || '<div class="card">No notifications.</div>'}</div>
  `;
}
