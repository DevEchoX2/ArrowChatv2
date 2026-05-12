const PREFS_KEY = 'arrowchat_settings';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

function activeNameFromPrefs(prefs) {
  return prefs['display-name'] || prefs.username || 'You';
}

function applySidebarIdentity(name, presence) {
  const userNameEl = document.querySelector('.user-name');
  const userStatusEl = document.querySelector('.user-status');
  if (userNameEl) userNameEl.textContent = name || 'You';
  if (userStatusEl) userStatusEl.textContent = (presence || 'online').replace(/^./, (ch) => ch.toUpperCase());
}

const prefs = loadPrefs();
if (prefs.username) document.getElementById('username').value = prefs.username;
if (prefs['display-name']) document.getElementById('display-name').value = prefs['display-name'];
if (prefs.bio) document.getElementById('bio').value = prefs.bio;
if (prefs.presence) document.getElementById('presence').value = prefs.presence;
if (prefs.email) document.getElementById('email').value = prefs.email;

applySidebarIdentity(activeNameFromPrefs(prefs), prefs.presence || 'online');

if (window.ArrowAuth) {
  window.ArrowAuth.ensureSession().then((session) => {
    if (!session || !session.payload) return;
    const payload = session.payload;
    if (!document.getElementById('username').value && payload.username) {
      document.getElementById('username').value = payload.username;
    }
    if (!document.getElementById('email').value && payload.email) {
      document.getElementById('email').value = payload.email;
    }
    applySidebarIdentity(activeNameFromPrefs(loadPrefs()), document.getElementById('presence').value || 'online');
  }).catch(() => {});
}

document.querySelectorAll('.toggle').forEach((btn) => {
  const key = btn.dataset.pref;
  if (key in prefs) {
    btn.classList.toggle('on', prefs[key]);
    btn.setAttribute('aria-pressed', String(prefs[key]));
  }
  btn.addEventListener('click', () => {
    const on = btn.classList.toggle('on');
    btn.setAttribute('aria-pressed', String(on));
    const next = loadPrefs();
    next[key] = on;
    savePrefs(next);
  });
});

const panelTitles = {
  profile: 'Profile',
  account: 'Account',
  notifications: 'Notifications',
  appearance: 'Appearance',
  privacy: 'Privacy',
};

const panelIcons = {
  profile: 'fa-user',
  account: 'fa-shield',
  notifications: 'fa-bell',
  appearance: 'fa-palette',
  privacy: 'fa-eye-slash',
};

document.querySelectorAll('.settings-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.settings-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.settings-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = tab.dataset.panel;
    document.getElementById(`panel-${panel}`).classList.add('active');
    document.getElementById('panel-title').innerHTML = `<i class="fa-solid ${panelIcons[panel]}"></i> ${panelTitles[panel]}`;
  });
});

document.getElementById('save-profile').addEventListener('click', async () => {
  const next = loadPrefs();
  next.username = document.getElementById('username').value.trim();
  next['display-name'] = document.getElementById('display-name').value.trim();
  next.bio = document.getElementById('bio').value.trim();
  next.presence = document.getElementById('presence').value;
  if (!savePrefs(next)) {
    const notice = document.getElementById('save-profile-notice');
    notice.textContent = 'Could not save profile.';
    setTimeout(() => { notice.textContent = ''; }, 2000);
    return;
  }

  if (window.ArrowAuth) {
    try {
      await window.ArrowAuth.updateSessionProfile({
        username: activeNameFromPrefs(next),
        email: next.email || document.getElementById('email').value.trim(),
      });
    } catch (err) {
      console.warn('Failed to update JWT session profile.', err);
    }
  }

  applySidebarIdentity(activeNameFromPrefs(next), next.presence);
  const notice = document.getElementById('save-profile-notice');
  notice.textContent = 'Saved!';
  setTimeout(() => { notice.textContent = ''; }, 2000);
});

document.getElementById('save-account').addEventListener('click', async () => {
  const notice = document.getElementById('save-account-notice');
  const next = loadPrefs();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  next.email = email;
  if (!savePrefs(next)) {
    notice.textContent = 'Could not save account settings.';
    setTimeout(() => { notice.textContent = ''; }, 2200);
    return;
  }

  if (!window.ArrowAuth) {
    notice.textContent = 'Saved!';
    setTimeout(() => { notice.textContent = ''; }, 2200);
    return;
  }

  try {
    await window.ArrowAuth.registerOrUpdateAccount({
      username: activeNameFromPrefs(next),
      email,
      password,
    });
    document.getElementById('password').value = '';
    notice.textContent = 'Account saved. JWT session updated.';
  } catch (err) {
    notice.textContent = err && err.message ? err.message : 'Could not save account.';
  }

  setTimeout(() => { notice.textContent = ''; }, 2600);
});
