// World Chat — socket-ready frontend logic

// TODO: Connect socket.io when backend is ready
// const socket = io();
// socket.on('connect', () => console.log('Connected:', socket.id));
// socket.on('message', (msg) => addMessage(msg.author, msg.text, msg.time, msg.self));
// socket.on('members', (list) => updateMembers(list));
// socket.on('member:join', (member) => addMember(member));
// socket.on('member:leave', (id) => removeMember(id));

const form = document.getElementById('composer-form');
const input = document.getElementById('composer-input');
const msgList = document.getElementById('messages');
const onlineEl = document.getElementById('online-count');
let lastAuthor = null;

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage(author, text, time, isSelf) {
  const empty = document.getElementById('msg-empty');
  if (empty) empty.remove();

  if (author === lastAuthor) {
    const cont = document.createElement('div');
    cont.className = 'msg-cont';
    cont.innerHTML = `<div class="msg-text">${esc(text)}</div>`;
    msgList.appendChild(cont);
  } else {
    const initials = author.slice(0, 2).toUpperCase();
    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.innerHTML = `
      <div class="msg-avatar">${esc(initials)}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-author">${esc(author)}</span>
          <span class="msg-time">${esc(time)}</span>
        </div>
        <div class="msg-text">${esc(text)}</div>
      </div>`;
    msgList.appendChild(msg);
    lastAuthor = author;
  }
  msgList.scrollTop = msgList.scrollHeight;
}

function updateMembers(list) {
  const container = document.getElementById('members-list');
  const onlineMembers = list.filter(m => m.status === 'online');
  const offlineMembers = list.filter(m => m.status !== 'online');
  onlineEl.textContent = onlineMembers.length;

  container.innerHTML =
    (onlineMembers.length ? '<div class="members-section-label">Online</div>' +
      onlineMembers.map(m => memberHTML(m)).join('') : '') +
    (offlineMembers.length ? '<div class="members-section-label">Offline</div>' +
      offlineMembers.map(m => memberHTML(m)).join('') : '');
}

function memberHTML(m) {
  return `<div class="member-item ${esc(m.status)}">
    <div class="member-avatar">${esc(m.name.slice(0,2).toUpperCase())}<span class="status-dot"></span></div>
    <span class="member-name">${esc(m.name)}</span>
  </div>`;
}

// Handle /commands
function handleCommand(text) {
  const [cmd, ...args] = text.slice(1).trim().split(/\s+/);
  switch (cmd.toLowerCase()) {
    case 'help':
      addMessage('System', 'Commands: /help, /rules, /dm <user>', ts(), false);
      return true;
    case 'rules':
      addMessage('System', 'Be respectful. No spam. No NSFW content.', ts(), false);
      return true;
    case 'dm':
      if (args[0]) addMessage('System', `DM with ${args[0]} — socket coming soon.`, ts(), false);
      return true;
    default:
      addMessage('System', `Unknown command: /${cmd}`, ts(), false);
      return true;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  if (text.startsWith('/')) {
    handleCommand(text);
  } else {
    addMessage('You', text, ts(), true);
    // TODO: socket.emit('message', { text });
  }
  input.value = '';
  lastAuthor = text.startsWith('/') ? 'System' : 'You';
});
