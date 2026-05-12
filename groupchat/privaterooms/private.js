// Private Rooms — logic (socket-ready)

const MAX_MEMBERS = 15;
const ROOMS_KEY = 'arrowchat_private_rooms';

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadRooms() {
  try { return JSON.parse(localStorage.getItem(ROOMS_KEY)) || []; } catch { return []; }
}
function saveRooms(rooms) { localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms)); }

let activeRoomId = null;
// messages stored per-room in memory
const roomMessages = {};
const roomLastAuthor = {};

// TODO: connect socket.io when backend is ready
// const socket = io();
// socket.on('room:message', ({ roomId, msg }) => { if (roomId === activeRoomId) addMessage(...); });
// socket.on('room:members', ({ roomId, list }) => { if (roomId === activeRoomId) renderMembers(list); });

/* ── Room list ── */
function renderRooms() {
  const rooms = loadRooms();
  const list = document.getElementById('rooms-list');
  if (!rooms.length) {
    list.innerHTML = `<div class="rooms-empty"><i class="fa-solid fa-lock"></i><span>No rooms yet.<br>Create one!</span></div>`;
    return;
  }
  list.innerHTML = rooms.map(r => `
    <div class="room-item${r.id === activeRoomId ? ' active' : ''}" data-id="${esc(r.id)}">
      <i class="fa-solid fa-lock"></i>
      <span class="room-item-name">${esc(r.name)}</span>
      <span class="room-item-count">${r.members.length}</span>
    </div>`).join('');
}

document.getElementById('rooms-list').addEventListener('click', (e) => {
  const item = e.target.closest('.room-item[data-id]');
  if (!item) return;
  selectRoom(item.dataset.id);
});

function selectRoom(id) {
  const rooms = loadRooms();
  const room = rooms.find(r => r.id === id);
  if (!room) return;
  activeRoomId = id;
  renderRooms();

  // header
  document.getElementById('chat-room-name').textContent = room.name;
  document.getElementById('composer-input').disabled = false;
  document.getElementById('send-btn').disabled = false;
  document.getElementById('composer-input').placeholder = `Message ${room.name}`;

  // messages
  const msgs = roomMessages[id] || [];
  const msgList = document.getElementById('messages');
  if (!msgs.length) {
    msgList.innerHTML = `<div class="chat-empty"><i class="fa-regular fa-comments"></i><span>No messages yet.</span><span class="sub">Say something!</span></div>`;
  } else {
    msgList.innerHTML = '';
    roomLastAuthor[id] = null;
    msgs.forEach(m => addMessageEl(m.author, m.text, m.time, id));
  }

  // members
  renderMembers(room.members, room.owner);
}

function renderMembers(members, owner) {
  const container = document.getElementById('members-list');
  document.getElementById('member-count').textContent = members.length;
  container.innerHTML = '<div class="members-section-label">Members</div>' +
    members.map(name => `
      <div class="member-item">
        <div class="member-avatar">${esc(name.slice(0,2).toUpperCase())}</div>
        <div>
          <div class="member-name">${esc(name)}</div>
          ${name === owner ? '<div class="member-role">Owner</div>' : ''}
        </div>
      </div>`).join('');
}

/* ── Chat ── */
function addMessageEl(author, text, time, roomId) {
  const empty = document.querySelector('.chat-empty');
  if (empty) empty.remove();
  const msgList = document.getElementById('messages');
  const prev = roomLastAuthor[roomId];

  if (author === prev) {
    const cont = document.createElement('div');
    cont.className = 'msg-cont';
    cont.innerHTML = `<div class="msg-text">${esc(text)}</div>`;
    msgList.appendChild(cont);
  } else {
    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.innerHTML = `
      <div class="msg-avatar">${esc(author.slice(0,2).toUpperCase())}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-author">${esc(author)}</span>
          <span class="msg-time">${esc(time)}</span>
        </div>
        <div class="msg-text">${esc(text)}</div>
      </div>`;
    msgList.appendChild(msg);
    roomLastAuthor[roomId] = author;
  }
  msgList.scrollTop = msgList.scrollHeight;
}

document.getElementById('composer-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeRoomId) return;
  const input = document.getElementById('composer-input');
  const text = input.value.trim();
  if (!text) return;
  const time = ts();
  if (!roomMessages[activeRoomId]) roomMessages[activeRoomId] = [];
  roomMessages[activeRoomId].push({ author: 'You', text, time });
  addMessageEl('You', text, time, activeRoomId);
  // TODO: socket.emit('room:message', { roomId: activeRoomId, text });
  input.value = '';
  roomLastAuthor[activeRoomId] = 'You';
});

/* ── Create Room Modal ── */
const modal = document.getElementById('create-modal');
const memberInputs = document.getElementById('member-inputs');
const memberCount = document.getElementById('member-count-display');
const modalError = document.getElementById('modal-error');

function countFilledMembers() {
  return [...memberInputs.querySelectorAll('input')].filter(i => i.value.trim()).length;
}

function updateMemberCount() {
  const count = countFilledMembers() + 1; // +1 for creator
  memberCount.textContent = `${count} / ${MAX_MEMBERS} members`;
  modalError.textContent = '';
}

function addMemberInput() {
  const total = memberInputs.querySelectorAll('input').length + 1; // +1 for creator
  if (total >= MAX_MEMBERS) {
    modalError.textContent = `Maximum ${MAX_MEMBERS} members allowed.`;
    return;
  }
  const row = document.createElement('div');
  row.className = 'member-input-row';
  row.innerHTML = `
    <input type="text" placeholder="Username..." autocomplete="off" />
    <button class="remove-member-btn" type="button" title="Remove"><i class="fa-solid fa-xmark"></i></button>`;
  row.querySelector('.remove-member-btn').addEventListener('click', () => {
    row.remove();
    updateMemberCount();
  });
  row.querySelector('input').addEventListener('input', updateMemberCount);
  memberInputs.appendChild(row);
  updateMemberCount();
}

document.getElementById('add-member-btn').addEventListener('click', addMemberInput);

document.getElementById('new-room-btn').addEventListener('click', () => {
  document.getElementById('room-name-input').value = '';
  memberInputs.innerHTML = '';
  modalError.textContent = '';
  updateMemberCount();
  modal.classList.add('open');
  document.getElementById('room-name-input').focus();
});

document.getElementById('cancel-create').addEventListener('click', () => {
  modal.classList.remove('open');
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('open');
});

document.getElementById('create-room-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('room-name-input').value.trim();
  if (!name) { modalError.textContent = 'Room name is required.'; return; }

  const inputs = [...memberInputs.querySelectorAll('input')];
  const members = inputs.map(i => i.value.trim()).filter(Boolean);
  const uniqueMembers = [...new Set(members)];

  if (uniqueMembers.length + 1 > MAX_MEMBERS) {
    modalError.textContent = `Maximum ${MAX_MEMBERS} members (including you).`;
    return;
  }

  const rooms = loadRooms();
  if (rooms.find(r => r.name === name)) {
    modalError.textContent = 'A room with that name already exists.';
    return;
  }

  const id = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  rooms.push({ id, name, owner: 'You', members: ['You', ...uniqueMembers], createdAt: Date.now() });
  saveRooms(rooms);
  renderRooms();
  modal.classList.remove('open');
  selectRoom(id);
  // TODO: socket.emit('room:create', { id, name, members: ['You', ...uniqueMembers] });
});

// Initial render
renderRooms();
updateMemberCount();
