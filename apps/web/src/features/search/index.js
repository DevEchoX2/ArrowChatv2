import { sanitizeText } from "../../../../../shared/utils/sanitize.js";

export function renderSearch(state) {
  const rows = state.searchIndex
    .slice(0, 20)
    .map(
      (r) => `<div class="card">
        <div class="row"><strong>${sanitizeText(r.scope)}</strong></div>
        <div>${sanitizeText(r.text)}</div>
      </div>`
    )
    .join("");

  return `
    <div class="header-row"><h2>Search</h2></div>
    <div class="card"><span class="subtle">Phase 2 query service and indexed retrieval preview.</span></div>
    <div class="list">${rows || '<div class="card">No indexed content yet.</div>'}</div>
  `;
}
