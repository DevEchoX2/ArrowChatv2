const BLOCKED_KEY = 'arrowchat_blocked';

function load() {
  try { return JSON.parse(localStorage.getItem(BLOCKED_KEY)) || []; } catch { return []; }
}

function save(list) {
  localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderIdentity() {
  const nameEl = document.querySelector('.user-name');
  if (!nameEl) return;
  if (window.ArrowAuth) {
    nameEl.textContent = window.ArrowAuth.getCurrentUsername();
  }
}

function render() {
  const blocked = load();
  document.getElementById('blocked-count').textContent = blocked.length;
  const container = document.getElementById('blocked-items');

  if (!blocked.length) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-ban"></i><span>No blocked users.</span></div>';
    return;
  }

  container.innerHTML = blocked.map((user) => `
    <div class="user-item">
      <div class="user-avatar">${esc(user.name.slice(0, 2).toUpperCase())}</div>
      <div class="user-info-col">
        <div class="user-display-name">${esc(user.name)}</div>
        <div class="user-sub">Blocked</div>
      </div>
      <div class="user-actions">
        <button class="action-btn" data-name="${esc(user.name)}" data-action="unblock">
          <i class="fa-solid fa-user-check"></i> Unblock
        </button>
      </div>
    </div>`).join('');
}

document.getElementById('blocked-list').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action="unblock"]');
  if (!btn) return;
  const name = btn.dataset.name;
  save(load().filter((user) => user.name !== name));
  render();
});

if (window.ArrowAuth) {
  window.ArrowAuth.ensureSession().then(renderIdentity).catch(renderIdentity);
} else {
  renderIdentity();
}

render();
