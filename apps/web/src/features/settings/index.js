import { sanitizeText } from "../../../../shared/utils/sanitize.js";

export function renderSettings(state, firebaseStatus) {
  return `
    <div class="header-row"><h2>Settings</h2></div>
    <div class="card">
      <div><strong>Account</strong></div>
      <div class="subtle">${sanitizeText(state.currentUser.email)}</div>
    </div>
    <div class="card">
      <div><strong>Privacy</strong></div>
      <div class="subtle">Blocked users cannot DM, mention, or interact.</div>
    </div>
    <div class="card">
      <div><strong>Firebase mode</strong></div>
      <div class="subtle">${sanitizeText(firebaseStatus.mode)}</div>
    </div>
  `;
}
