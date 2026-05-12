(() => {
  const USERS_KEY = 'arrowchat_accounts';
  const TOKEN_KEY = 'arrowchat_auth_token';
  const ISS = 'arrowchatv2';

  const te = new TextEncoder();
  const td = new TextDecoder();
  const webCrypto = window.crypto || window.msCrypto || globalThis.crypto || null;
  const subtleCrypto = webCrypto && (webCrypto.subtle || webCrypto.webkitSubtle);

  function secureCryptoError() {
    return new Error('Secure crypto is unavailable. Open ArrowChat from HTTPS or localhost (not file://).');
  }

  function randomHex(bytesLen) {
    if (!(webCrypto && typeof webCrypto.getRandomValues === 'function')) throw secureCryptoError();
    const bytes = new Uint8Array(bytesLen);
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function secureRandomId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${randomHex(12)}`;
  }

  let runtimeJwtSecret = null;

  function b64url(bytes) {
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function b64urlText(text) {
    return b64url(te.encode(text));
  }

  function fromB64url(segment) {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((segment.length + 3) % 4);
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }

  function parseJsonSegment(segment) {
    try {
      return JSON.parse(td.decode(fromB64url(segment)));
    } catch {
      return null;
    }
  }

  function hexToBytes(hex) {
    const clean = String(hex || '').replace(/[^0-9a-f]/gi, '');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return out;
  }

  function getJwtSecret() {
    if (!runtimeJwtSecret) runtimeJwtSecret = `jwt_secret_${randomHex(24)}`;
    return runtimeJwtSecret;
  }

  async function sign(input) {
    if (!subtleCrypto) throw secureCryptoError();
    const key = await subtleCrypto.importKey('raw', te.encode(getJwtSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await subtleCrypto.sign('HMAC', key, te.encode(input));
    return b64url(new Uint8Array(sig));
  }

  async function hashPassword(password, saltHex) {
    if (!subtleCrypto) throw secureCryptoError();
    const key = await subtleCrypto.importKey('raw', te.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtleCrypto.deriveBits(
      { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 600000, hash: 'SHA-256' },
      key,
      256,
    );
    return b64url(new Uint8Array(bits));
  }

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function normalizeUsername(name) {
    const normalized = String(name || '')
      .replace(/[^a-zA-Z0-9 _.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 64);
    return normalized.length >= 2 ? normalized : 'You';
  }

  function passwordIsStrong(password) {
    const value = String(password || '');
    return (
      value.length >= 8 &&
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  }

  async function createToken(payload, expiresInSeconds = 60 * 60 * 24 * 7) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'HS256', typ: 'JWT' };
    const claims = { iss: ISS, iat: now, exp: now + expiresInSeconds, ...payload };
    const h = b64urlText(JSON.stringify(header));
    const p = b64urlText(JSON.stringify(claims));
    const s = await sign(`${h}.${p}`);
    return `${h}.${p}.${s}`;
  }

  async function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, sig] = parts;
    const expected = await sign(`${h}.${p}`);
    if (sig !== expected) return null;
    const payload = parseJsonSegment(p);
    if (!payload || payload.iss !== ISS) return null;
    if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null;
    return payload;
  }

  async function setSession(payload) {
    const token = await createToken(payload);
    localStorage.setItem(TOKEN_KEY, token);
    return { token, payload: await verifyToken(token) };
  }

  async function getSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    const payload = await verifyToken(token);
    if (!payload) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return { token, payload };
  }

  function getCurrentUsername() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = parseJsonSegment(parts[1]);
        if (payload && payload.username) return normalizeUsername(payload.username);
      }
    }
    try {
      const prefs = JSON.parse(localStorage.getItem('arrowchat_settings')) || {};
      return normalizeUsername(prefs['display-name'] || prefs.username || 'You');
    } catch {
      return 'You';
    }
  }

  async function ensureSession() {
    const existing = await getSession();
    if (existing) return existing;
    const username = getCurrentUsername();
    return setSession({ type: 'guest', username });
  }

  async function updateSessionProfile({ username, email }) {
    const current = await ensureSession();
    return setSession({ ...current.payload, username: normalizeUsername(username), email: String(email || current.payload.email || '').trim() });
  }

  async function registerOrUpdateAccount({ username, email, password }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email is required.');

    const users = loadUsers();
    const cleanUsername = normalizeUsername(username);
    const now = Date.now();
    let user = users.find((u) => u.email === cleanEmail);

    if (!user) {
      if (!passwordIsStrong(password)) throw new Error('Use at least 8 chars with upper, lower, number, and symbol.');
      user = {
        id: secureRandomId('acct'),
        email: cleanEmail,
        username: cleanUsername,
        passwordSalt: randomHex(16),
        passwordHash: '',
        createdAt: now,
        updatedAt: now,
      };
      user.passwordHash = await hashPassword(String(password), user.passwordSalt);
      users.push(user);
    } else {
      user.username = cleanUsername;
      user.updatedAt = now;
      user.passwordSalt = user.passwordSalt || randomHex(16);
      if (password) {
        if (!passwordIsStrong(password)) throw new Error('Use at least 8 chars with upper, lower, number, and symbol.');
        user.passwordHash = await hashPassword(String(password), user.passwordSalt);
      }
    }

    saveUsers(users);
    return setSession({ type: 'account', sub: user.id, username: user.username, email: user.email });
  }

  async function login({ email, password }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email is required.');
    if (!password) throw new Error('Password is required.');

    const users = loadUsers();
    const user = users.find((u) => u.email === cleanEmail);
    if (!user) throw new Error('No account found with that email.');
    if (!user.passwordHash) throw new Error('Account has no password set. Please register again.');

    const hash = await hashPassword(String(password), user.passwordSalt);
    if (hash !== user.passwordHash) throw new Error('Incorrect password.');

    return setSession({ type: 'account', sub: user.id, username: user.username, email: user.email });
  }

  async function register({ username, email, password }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email is required.');
    if (!password) throw new Error('Password is required.');
    if (!passwordIsStrong(password)) throw new Error('Password needs 8+ chars with upper, lower, number, and symbol.');

    const users = loadUsers();
    if (users.find((u) => u.email === cleanEmail)) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const cleanUsername = normalizeUsername(username) || cleanEmail.split('@')[0].slice(0, 32);
    const now = Date.now();
    const saltHex = randomHex(16);
    const user = {
      id: secureRandomId('acct'),
      email: cleanEmail,
      username: cleanUsername,
      passwordSalt: saltHex,
      passwordHash: await hashPassword(String(password), saltHex),
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    saveUsers(users);
    return setSession({ type: 'account', sub: user.id, username: user.username, email: user.email });
  }

  async function requireLogin(loginUrl) {
    const session = await getSession();
    if (!session) {
      window.location.replace(loginUrl || 'login.html');
      return null;
    }
    return session;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
  }

  window.ArrowAuth = {
    createToken,
    verifyToken,
    getSession,
    ensureSession,
    getCurrentUsername,
    updateSessionProfile,
    registerOrUpdateAccount,
    login,
    register,
    requireLogin,
    logout,
  };
})();
