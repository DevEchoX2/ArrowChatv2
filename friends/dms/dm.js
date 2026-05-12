const params = new URLSearchParams(window.location.search);
const dmUser = ((params.get('user') || 'Friend').replace(/\s+/g, ' ').trim().slice(0, 64)) || 'Friend';
const dmTitle = document.getElementById('dm-title');
const form = document.getElementById('composer-form');
const input = document.getElementById('composer-input');
const msgList = document.getElementById('messages');
const callBanner = document.getElementById('call-banner');
const callBannerText = document.getElementById('call-banner-text');

const callBtn = document.getElementById('start-call-btn');
const privateCallBtn = document.getElementById('start-private-call-btn');
const endCallBtn = document.getElementById('end-call-btn');

const DM_KEY = `arrowchat_dm_messages_${encodeURIComponent(dmUser.toLowerCase())}`;
let activeCall = null;

dmTitle.textContent = `DM with ${dmUser}`;

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadMessages() {
  try { return JSON.parse(localStorage.getItem(DM_KEY)) || []; } catch { return []; }
}

function saveMessages(messages) {
  localStorage.setItem(DM_KEY, JSON.stringify(messages));
}

function addMessage(author, text, time) {
  const empty = document.getElementById('msg-empty');
  if (empty) empty.remove();

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
  msgList.scrollTop = msgList.scrollHeight;
}

function pushMessage(author, text) {
  const messages = loadMessages();
  const time = ts();
  messages.push({ author, text, time });
  saveMessages(messages);
  addMessage(author, text, time);
}

function renderMessages() {
  const messages = loadMessages();
  if (!messages.length) return;
  msgList.innerHTML = '';
  messages.forEach((m) => addMessage(m.author, m.text, m.time));
}

function setCallState(type) {
  activeCall = type;
  if (!type) {
    callBanner.hidden = true;
    callBannerText.textContent = '';
    return;
  }
  callBanner.hidden = false;
  callBannerText.textContent = type === 'private'
    ? `Private call with ${dmUser} is active.`
    : `Call with ${dmUser} is active.`;
}

callBtn.addEventListener('click', () => {
  setCallState('call');
  pushMessage('System', `You started a call with ${dmUser}.`);
});

privateCallBtn.addEventListener('click', () => {
  setCallState('private');
  pushMessage('System', `You started a private call with ${dmUser}.`);
});

endCallBtn.addEventListener('click', () => {
  if (!activeCall) return;
  const prior = activeCall;
  setCallState(null);
  pushMessage('System', prior === 'private'
    ? `You ended the private call with ${dmUser}.`
    : `You ended the call with ${dmUser}.`);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  pushMessage('You', text);
  input.value = '';
});

renderMessages();
