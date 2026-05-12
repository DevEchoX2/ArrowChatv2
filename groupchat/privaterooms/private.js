// Private Rooms — real WebRTC via PeerJS

const MAX_MEMBERS = 15;
const ROOMS_KEY = 'arrowchat_private_rooms';

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Auth guard ──────────────────────────────────────────────────────────────
let currentUser = { username: 'You', email: '' };

(async () => {
  const session = await ArrowAuth.requireLogin('../../login.html');
  if (!session) return; // redirecting

  currentUser = {
    username: session.payload.username || 'You',
    email: session.payload.email || '',
  };

  // Update sidebar user card
  const footerUsername = document.getElementById('footer-username');
  const footerAvatar = document.getElementById('footer-avatar');
  if (footerUsername) footerUsername.textContent = currentUser.username;
  if (footerAvatar) footerAvatar.textContent = currentUser.username.slice(0, 2).toUpperCase();

  document.body.style.visibility = '';
  init();
})();

// ── Logout ───────────────────────────────────────────────────────────────────
function doLogout() {
  if (callActive) endCall();
  ArrowAuth.logout();
  location.replace('../../login.html');
}
document.getElementById('logout-btn').addEventListener('click', doLogout);
document.getElementById('logout-header-btn').addEventListener('click', doLogout);

// ── Room storage ─────────────────────────────────────────────────────────────
function loadRooms() {
  try { return JSON.parse(localStorage.getItem(ROOMS_KEY)) || []; } catch { return []; }
}
function saveRooms(rooms) { localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms)); }

// ── State ─────────────────────────────────────────────────────────────────────
let activeRoomId = null;
const roomMessages = {};
const roomLastAuthor = {};

// ── WebRTC / call state ───────────────────────────────────────────────────────
let peer = null;
let localStream = null;
let callActive = false;
let micEnabled = true;
let cameraEnabled = false;
let screenSharing = false;
let screenStream = null;
const callConnections = {}; // { [peerId]: { call, username } }

// ── Peer ID helpers ───────────────────────────────────────────────────────────
function sanitizePart(str, maxLen) {
  return String(str || '').replace(/[^a-zA-Z0-9]/g, '-').slice(0, maxLen);
}
function myPeerId() {
  if (!activeRoomId) return null;
  return `ac2-${sanitizePart(activeRoomId, 30)}-${sanitizePart(currentUser.username, 20)}`;
}
function memberPeerId(roomId, username) {
  return `ac2-${sanitizePart(roomId, 30)}-${sanitizePart(username, 20)}`;
}
function usernameFromPeerId(peerId, roomId) {
  const prefix = `ac2-${sanitizePart(roomId, 30)}-`;
  if (peerId.startsWith(prefix)) return peerId.slice(prefix.length);
  return peerId;
}

// ── Room list ─────────────────────────────────────────────────────────────────
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

  document.getElementById('chat-room-name').textContent = room.name;
  document.getElementById('composer-input').disabled = false;
  document.getElementById('send-btn').disabled = false;
  document.getElementById('composer-input').placeholder = `Message ${room.name}`;
  document.getElementById('start-call-btn').disabled = false;

  const msgs = roomMessages[id] || [];
  const msgList = document.getElementById('messages');
  if (!msgs.length) {
    msgList.innerHTML = `<div class="chat-empty" id="chat-empty"><i class="fa-regular fa-comments"></i><span>No messages yet.</span><span class="sub">Say something!</span></div>`;
  } else {
    msgList.innerHTML = '';
    roomLastAuthor[id] = null;
    msgs.forEach(m => appendMessageEl(m.author, m.text, m.time, m.system || false, id));
  }

  renderMembers(room.members, room.owner);
}

function renderMembers(members, owner) {
  const container = document.getElementById('members-list');
  document.getElementById('member-count').textContent = members.length;
  container.innerHTML = '<div class="members-section-label">Members</div>' +
    members.map(name => {
      const inCall = callActive && (name === currentUser.username || callConnections[memberPeerId(activeRoomId, name)]);
      return `
      <div class="member-item">
        <div class="member-avatar">${esc(name.slice(0,2).toUpperCase())}</div>
        <div>
          <div class="member-name">${esc(name)}</div>
          ${name === owner ? '<div class="member-role">Owner</div>' : ''}
          ${inCall ? '<div class="member-in-call"><i class="fa-solid fa-phone" style="font-size:0.6rem"></i> In call</div>' : ''}
        </div>
      </div>`;
    }).join('');
}

// ── Chat messages ─────────────────────────────────────────────────────────────
function addSystemMessage(roomId, text) {
  const time = ts();
  if (!roomMessages[roomId]) roomMessages[roomId] = [];
  roomMessages[roomId].push({ author: 'System', text, time, system: true });
  if (roomId === activeRoomId) appendMessageEl('System', text, time, true, roomId);
}

function appendMessageEl(author, text, time, isSystem, roomId) {
  const empty = document.getElementById('chat-empty');
  if (empty) empty.remove();
  const msgList = document.getElementById('messages');

  if (isSystem) {
    const el = document.createElement('div');
    el.className = 'msg-system';
    el.textContent = text;
    msgList.appendChild(el);
    roomLastAuthor[roomId] = null;
    msgList.scrollTop = msgList.scrollHeight;
    return;
  }

  const prev = roomLastAuthor[roomId];
  if (author === prev) {
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
  roomMessages[activeRoomId].push({ author: currentUser.username, text, time });
  appendMessageEl(currentUser.username, text, time, false, activeRoomId);
  input.value = '';
  roomLastAuthor[activeRoomId] = currentUser.username;
});

// ── WebRTC Call ───────────────────────────────────────────────────────────────

// Participant tile management
function getOrCreateParticipantEl(username, isSelf) {
  const safeId = 'ptile-' + username.replace(/[^a-zA-Z0-9]/g, '_');
  let el = document.getElementById(safeId);
  if (el) return el;

  const initials = username.slice(0, 2).toUpperCase();
  el = document.createElement('div');
  el.className = 'participant';
  el.id = safeId;
  el.innerHTML = `
    <div class="participant-ring">
      <div class="participant-video-wrap">
        <div class="participant-avatar-text">${esc(initials)}</div>
        <video class="participant-video" autoplay playsinline ${isSelf ? 'muted' : ''}></video>
        <div class="participant-muted-badge" hidden>
          <i class="fa-solid fa-microphone-slash"></i>
        </div>
      </div>
    </div>
    <span class="participant-name">${esc(username)}${isSelf ? '<span class="you-tag">(you)</span>' : ''}</span>`;
  document.getElementById('participants').appendChild(el);
  return el;
}

function removeParticipantTile(username) {
  const safeId = 'ptile-' + username.replace(/[^a-zA-Z0-9]/g, '_');
  const el = document.getElementById(safeId);
  if (el) el.remove();
}

function setParticipantStream(username, stream) {
  const safeId = 'ptile-' + username.replace(/[^a-zA-Z0-9]/g, '_');
  const el = document.getElementById(safeId);
  if (!el) return;
  const video = el.querySelector('.participant-video');
  if (!video) return;
  if (stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled) {
    video.srcObject = stream;
    video.classList.add('active');
    el.querySelector('.participant-avatar-text').style.display = 'none';
  } else {
    video.srcObject = null;
    video.classList.remove('active');
    el.querySelector('.participant-avatar-text').style.display = '';
  }
}

function setParticipantMuted(username, muted) {
  const safeId = 'ptile-' + username.replace(/[^a-zA-Z0-9]/g, '_');
  const el = document.getElementById(safeId);
  if (!el) return;
  const badge = el.querySelector('.participant-muted-badge');
  if (badge) badge.hidden = !muted;
}

function setParticipantSpeaking(username, speaking) {
  const safeId = 'ptile-' + username.replace(/[^a-zA-Z0-9]/g, '_');
  const el = document.getElementById(safeId);
  if (!el) return;
  const ring = el.querySelector('.participant-ring');
  if (ring) ring.classList.toggle('speaking', speaking);
}

// Local voice activity detection
let vadContext = null;
function startVAD() {
  if (!localStream) return;
  try {
    vadContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = vadContext.createMediaStreamSource(localStream);
    const analyser = vadContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;
    function tick() {
      if (!callActive) { vadContext.close(); vadContext = null; return; }
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const nowSpeaking = avg > 8 && micEnabled;
      if (nowSpeaking !== speaking) {
        speaking = nowSpeaking;
        setParticipantSpeaking(currentUser.username, speaking);
      }
      requestAnimationFrame(tick);
    }
    tick();
  } catch (_) {}
}

// Start call
async function startCall() {
  if (callActive) return;
  if (!activeRoomId) return;
  const rooms = loadRooms();
  const room = rooms.find(r => r.id === activeRoomId);
  if (!room) return;

  // Get media
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    cameraEnabled = true;
  } catch (_) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      cameraEnabled = false;
    } catch (err) {
      addSystemMessage(activeRoomId, 'Could not access microphone. Please allow audio access.');
      return;
    }
  }

  // Disable video track by default (camera off until user enables)
  const vt = localStream.getVideoTracks()[0];
  if (vt) { vt.enabled = false; cameraEnabled = false; }

  micEnabled = true;
  callActive = true;
  screenSharing = false;

  // Show call UI
  const callArea = document.getElementById('call-area');
  callArea.hidden = false;
  document.getElementById('start-call-btn').disabled = true;
  updateCallControls();

  // Add self tile
  getOrCreateParticipantEl(currentUser.username, true);
  setParticipantMuted(currentUser.username, false);
  // show local video preview if camera on
  if (cameraEnabled && vt && vt.enabled) setParticipantStream(currentUser.username, localStream);

  startVAD();

  // Create PeerJS peer
  const pid = myPeerId();
  peer = new Peer(pid, {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    },
  });

  peer.on('open', () => {
    addSystemMessage(activeRoomId, `You joined the call in ${room.name}.`);
    // Dial all other room members
    room.members.forEach(username => {
      if (username === currentUser.username) return;
      const theirId = memberPeerId(activeRoomId, username);
      dialPeer(theirId, username);
    });
    refreshMembersPanel(room);
  });

  peer.on('call', (incomingCall) => {
    incomingCall.answer(localStream);
    handleIncomingCall(incomingCall);
  });

  peer.on('error', (err) => {
    if (err.type === 'peer-unavailable') return; // normal — remote not in call yet
    console.error('PeerJS:', err);
    addSystemMessage(activeRoomId, `Call connection error: ${err.type}`);
  });
}

function dialPeer(peerId, username) {
  if (!peer || !localStream) return;
  const call = peer.call(peerId, localStream);
  if (!call) return;
  callConnections[peerId] = { call, username };

  call.on('stream', (remoteStream) => {
    const el = getOrCreateParticipantEl(username, false);
    const video = el.querySelector('.participant-video');
    video.srcObject = remoteStream;
    // show video if remote has video tracks
    const hasVideo = remoteStream.getVideoTracks().length > 0;
    if (hasVideo) {
      video.classList.add('active');
      el.querySelector('.participant-avatar-text').style.display = 'none';
    }
  });

  call.on('close', () => {
    removeParticipantTile(username);
    delete callConnections[peerId];
    if (activeRoomId) {
      addSystemMessage(activeRoomId, `${username} left the call.`);
      const rooms = loadRooms();
      const room = rooms.find(r => r.id === activeRoomId);
      if (room) refreshMembersPanel(room);
    }
  });

  call.on('error', () => {
    removeParticipantTile(username);
    delete callConnections[peerId];
  });
}

function handleIncomingCall(incomingCall) {
  const peerId = incomingCall.peer;
  const username = activeRoomId ? usernameFromPeerId(peerId, activeRoomId) : peerId;

  if (callConnections[peerId]) return; // already connected
  callConnections[peerId] = { call: incomingCall, username };

  addSystemMessage(activeRoomId, `${username} joined the call.`);
  const rooms = loadRooms();
  const room = rooms.find(r => r.id === activeRoomId);
  if (room) refreshMembersPanel(room);

  incomingCall.on('stream', (remoteStream) => {
    const el = getOrCreateParticipantEl(username, false);
    const video = el.querySelector('.participant-video');
    video.srcObject = remoteStream;
    const hasVideo = remoteStream.getVideoTracks().length > 0;
    if (hasVideo) {
      video.classList.add('active');
      el.querySelector('.participant-avatar-text').style.display = 'none';
    }
  });

  incomingCall.on('close', () => {
    removeParticipantTile(username);
    delete callConnections[peerId];
    if (activeRoomId) {
      addSystemMessage(activeRoomId, `${username} left the call.`);
      const rooms2 = loadRooms();
      const room2 = rooms2.find(r => r.id === activeRoomId);
      if (room2) refreshMembersPanel(room2);
    }
  });

  incomingCall.on('error', () => {
    removeParticipantTile(username);
    delete callConnections[peerId];
  });
}

function endCall() {
  if (!callActive) return;

  // Close all peer connections
  Object.values(callConnections).forEach(({ call }) => {
    try { call.close(); } catch (_) {}
  });
  Object.keys(callConnections).forEach(k => delete callConnections[k]);

  // Stop local media
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }

  // Destroy peer
  if (peer) { try { peer.destroy(); } catch (_) {} peer = null; }

  callActive = false;
  micEnabled = true;
  cameraEnabled = false;
  screenSharing = false;

  // Hide call area
  const callArea = document.getElementById('call-area');
  callArea.hidden = true;
  document.getElementById('participants').innerHTML = '';
  document.getElementById('start-call-btn').disabled = !activeRoomId;

  if (activeRoomId) {
    addSystemMessage(activeRoomId, 'You ended the call.');
    const rooms = loadRooms();
    const room = rooms.find(r => r.id === activeRoomId);
    if (room) refreshMembersPanel(room);
  }
}

function toggleMic() {
  if (!localStream) return;
  const at = localStream.getAudioTracks()[0];
  if (!at) return;
  micEnabled = !micEnabled;
  at.enabled = micEnabled;
  setParticipantMuted(currentUser.username, !micEnabled);
  updateCallControls();
}

function toggleCamera() {
  if (!localStream) return;
  const vt = localStream.getVideoTracks()[0];
  if (!vt) return;
  cameraEnabled = !cameraEnabled;
  vt.enabled = cameraEnabled;
  if (cameraEnabled) {
    setParticipantStream(currentUser.username, localStream);
  } else {
    // hide local video, show avatar
    const safeId = 'ptile-' + currentUser.username.replace(/[^a-zA-Z0-9]/g, '_');
    const el = document.getElementById(safeId);
    if (el) {
      el.querySelector('.participant-video').classList.remove('active');
      el.querySelector('.participant-avatar-text').style.display = '';
    }
  }
  updateCallControls();
}

async function toggleScreenShare() {
  if (!callActive) return;
  if (screenSharing) {
    // Revert to camera video track
    const camTrack = localStream && localStream.getVideoTracks()[0] || null;
    Object.values(callConnections).forEach(({ call }) => {
      const pc = call.peerConnection;
      if (!pc) return;
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(camTrack);
    });
    if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
    screenSharing = false;

    // Update self tile
    if (cameraEnabled && camTrack) {
      setParticipantStream(currentUser.username, localStream);
    }
  } else {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) { screenStream = null; return; }

      screenTrack.addEventListener('ended', () => {
        if (screenSharing) toggleScreenShare();
      });

      // Replace video sender in all peer connections
      Object.values(callConnections).forEach(({ call }) => {
        const pc = call.peerConnection;
        if (!pc) return;
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenSharing = true;

      // Show screen in self tile
      const safeId = 'ptile-' + currentUser.username.replace(/[^a-zA-Z0-9]/g, '_');
      const el = document.getElementById(safeId);
      if (el) {
        const video = el.querySelector('.participant-video');
        video.srcObject = screenStream;
        video.classList.add('active');
        el.querySelector('.participant-avatar-text').style.display = 'none';
      }
    } catch (_) {
      // User cancelled or permission denied
    }
  }
  updateCallControls();
}

function updateCallControls() {
  const micBtn = document.getElementById('mic-btn');
  const micIcon = document.getElementById('mic-icon');
  const camBtn = document.getElementById('cam-btn');
  const camIcon = document.getElementById('cam-icon');
  const screenBtn = document.getElementById('screen-btn');
  const screenIcon = document.getElementById('screen-icon');

  micBtn.classList.toggle('muted', !micEnabled);
  micIcon.className = micEnabled ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash';

  camBtn.classList.toggle('cam-off', !cameraEnabled);
  camIcon.className = cameraEnabled ? 'fa-solid fa-video' : 'fa-solid fa-video-slash';

  screenBtn.classList.toggle('screen-on', screenSharing);
  screenIcon.className = screenSharing ? 'fa-solid fa-display' : 'fa-solid fa-display';
}

function refreshMembersPanel(room) {
  renderMembers(room.members, room.owner);
}

// Call control button wiring
document.getElementById('start-call-btn').addEventListener('click', startCall);
document.getElementById('end-call-btn').addEventListener('click', endCall);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('cam-btn').addEventListener('click', toggleCamera);
document.getElementById('screen-btn').addEventListener('click', toggleScreenShare);

// ── Create Room Modal ─────────────────────────────────────────────────────────
const modal = document.getElementById('create-modal');
const memberInputs = document.getElementById('member-inputs');
const memberCountDisplay = document.getElementById('member-count-display');
const modalError = document.getElementById('modal-error');

function countFilledMembers() {
  return [...memberInputs.querySelectorAll('input')].filter(i => i.value.trim()).length;
}
function updateMemberCount() {
  const count = countFilledMembers() + 1;
  memberCountDisplay.textContent = `${count} / ${MAX_MEMBERS} members`;
  modalError.textContent = '';
}
function addMemberInput() {
  const total = memberInputs.querySelectorAll('input').length + 1;
  if (total >= MAX_MEMBERS) { modalError.textContent = `Maximum ${MAX_MEMBERS} members allowed.`; return; }
  const row = document.createElement('div');
  row.className = 'member-input-row';
  row.innerHTML = `
    <input type="text" placeholder="Username..." autocomplete="off" />
    <button class="remove-member-btn" type="button" title="Remove"><i class="fa-solid fa-xmark"></i></button>`;
  row.querySelector('.remove-member-btn').addEventListener('click', () => { row.remove(); updateMemberCount(); });
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
document.getElementById('cancel-create').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

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
  if (rooms.find(r => r.name === name)) { modalError.textContent = 'A room with that name already exists.'; return; }

  const id = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  rooms.push({ id, name, owner: currentUser.username, members: [currentUser.username, ...uniqueMembers], createdAt: Date.now() });
  saveRooms(rooms);
  renderRooms();
  modal.classList.remove('open');
  selectRoom(id);
});

// ── Init ───────────────────────────────────────────────────────────────────────
function init() {
  renderRooms();
  updateMemberCount();
}
