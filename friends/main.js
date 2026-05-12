// Friends page logic

const FRIENDS_KEY = 'arrowchat_friends';
const BLOCKED_KEY = 'arrowchat_blocked';

function loadFriends() {
  try { return JSON.parse(localStorage.getItem(FRIENDS_KEY)) || []; } catch { return []; }
}
function loadBlocked() {
  try { return JSON.parse(localStorage.getItem(BLOCKED_KEY)) || []; } catch { return []; }
}
function saveFriends(list) { localStorage.setItem(FRIENDS_KEY, JSON.stringify(list)); }
function saveBlocked(list) { localStorage.setItem(BLOCKED_KEY, JSON.stringify(list)); }

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const STATUSES = ['online', 'away', 'offline'];

function friendItemHTML(f, tab) {
  const dotClass = `status-${f.status}`;
  const actionsBtns = tab === 'blocked'
    ? `<button class="friend-btn" data-action="unblock" data-name="${esc(f.name)}">
         <i class="fa-solid fa-user-check"></i> Unblock
       </button>`
    : `<button class="friend-btn" data-action="message" data-name="${esc(f.name)}" title="Message">
         <i class="fa-solid fa-message"></i>
       </button>
       <button class="friend-btn danger" data-action="remove" data-name="${esc(f.name)}" title="Remove">
         <i class="fa-solid fa-user-xmark"></i>
       </button>
       <button class="friend-btn danger" data-action="block" data-name="${esc(f.name)}" title="Block">
         <i class="fa-solid fa-ban"></i>
       </button>`;

  return `<div class="friend-item" data-name="${esc(f.name)}">
    <div class="friend-avatar">
      ${esc(f.name.slice(0,2).toUpperCase())}
      <span class="status-dot ${dotClass}"></span>
    </div>
    <div class="friend-info">
      <div class="friend-name">${esc(f.name)}</div>
      <div class="friend-sub">${tab === 'blocked' ? 'Blocked' : f.status}</div>
    </div>
    <div class="friend-actions">${actionsBtns}</div>
  </div>`;
}

function renderPanel(tab) {
  const friends = loadFriends();
  const blocked = loadBlocked();

  const panelOnline  = document.getElementById('panel-online');
  const panelAll     = document.getElementById('panel-all');
  const panelAdd     = document.getElementById('panel-add');
  const panelBlocked = document.getElementById('panel-blocked');

  [panelOnline, panelAll, panelAdd, panelBlocked].forEach(p => p && p.classList.remove('active'));

  if (tab === 'online') {
    const online = friends.filter(f => f.status === 'online');
    panelOnline.innerHTML = `<div class="panel-title">Online — ${online.length}</div>` +
      (online.length ? online.map(f => friendItemHTML(f, 'online')).join('') : emptyHTML('fa-circle-dot', 'No friends online right now.'));
    panelOnline.classList.add('active');
  } else if (tab === 'all') {
    panelAll.innerHTML = `<div class="panel-title">All Friends — ${friends.length}</div>` +
      (friends.length ? friends.map(f => friendItemHTML(f, 'all')).join('') : emptyHTML('fa-user-group', 'No friends yet. Add some!'));
    panelAll.classList.add('active');
  } else if (tab === 'add') {
    panelAdd.classList.add('active');
  } else if (tab === 'blocked') {
    panelBlocked.innerHTML = `<div class="panel-title">Blocked — ${blocked.length}</div>` +
      (blocked.length ? blocked.map(f => friendItemHTML(f, 'blocked')).join('') : emptyHTML('fa-ban', 'No blocked users.'));
    panelBlocked.classList.add('active');
  }
}

function emptyHTML(icon, text) {
  return `<div class="empty-state"><i class="fa-solid ${esc(icon)}"></i><span>${esc(text)}</span></div>`;
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPanel(btn.dataset.tab);
  });
});

// Delegate clicks on friend actions
document.getElementById('friends-content').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const name = btn.dataset.name;
  const action = btn.dataset.action;
  const friends = loadFriends();
  const blocked = loadBlocked();

  if (action === 'remove') {
    saveFriends(friends.filter(f => f.name !== name));
    renderPanel(document.querySelector('.tab-btn.active').dataset.tab);
  } else if (action === 'block') {
    const f = friends.find(f => f.name === name);
    saveFriends(friends.filter(f => f.name !== name));
    if (f && !blocked.find(b => b.name === name)) {
      blocked.push({ name: f.name, status: 'offline' });
      saveBlocked(blocked);
    }
    renderPanel(document.querySelector('.tab-btn.active').dataset.tab);
  } else if (action === 'unblock') {
    saveBlocked(blocked.filter(b => b.name !== name));
    renderPanel('blocked');
  } else if (action === 'message') {
    alert(`DM with ${name} — socket coming soon.`);
  }
});

// Add friend form
document.getElementById('add-friend-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('add-input');
  const notice = document.getElementById('add-notice');
  const name = input.value.trim();
  if (!name) return;
  const friends = loadFriends();
  const blocked = loadBlocked();
  if (friends.find(f => f.name === name)) {
    notice.textContent = `${name} is already your friend.`;
    return;
  }
  if (blocked.find(b => b.name === name)) {
    notice.textContent = `${name} is blocked. Unblock them first.`;
    return;
  }
  friends.push({ name, status: STATUSES[Math.floor(Math.random() * STATUSES.length)] });
  saveFriends(friends);
  input.value = '';
  notice.textContent = `Friend request sent to ${name}!`;
  setTimeout(() => { notice.textContent = ''; }, 3000);
});

// Initial render
renderPanel('online');
