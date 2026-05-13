(() => {
  const USERS_KEY = 'arrowchat_accounts';
  const TOKEN_KEY = 'arrowchat_auth_token';
  const FIREBASE_CONFIG_GLOBAL_KEY = 'ARROWCHAT_FIREBASE_CONFIG';
  const FIREBASE_CONFIG_STORAGE_KEY = 'arrowchat_firebase_config';
  const FIREBASE_APP_CDN = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
  const FIREBASE_AUTH_CDN = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js';
  const ISS = 'arrowchatv2';
  const PASSWORD_COMPLEXITY_MESSAGE = 'Use at least 8 chars with upper, lower, number, and symbol.';

  const te = new TextEncoder();
  const td = new TextDecoder();
  const runtimeScope = typeof globalThis !== 'undefined' ? globalThis : {};
  const webCrypto = runtimeScope.crypto || runtimeScope.msCrypto || null;
  const subtleCrypto = webCrypto && (webCrypto.subtle || webCrypto.webkitSubtle);
  const SECURE_CRYPTO_UNAVAILABLE_MESSAGE = 'Secure crypto is unavailable in this runtime. Use a secure browser context (HTTPS or localhost).';
  const SECURE_CRYPTO_UNAVAILABLE_CODE = 'ARROWCHAT_SECURE_CRYPTO_UNAVAILABLE';

  function secureCryptoError() {
    const err = new Error(SECURE_CRYPTO_UNAVAILABLE_MESSAGE);
    err.code = SECURE_CRYPTO_UNAVAILABLE_CODE;
    return err;
  }

  function isSecureCryptoUnavailableError(err) {
    return !!(err && err.code === SECURE_CRYPTO_UNAVAILABLE_CODE);
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
  let firebaseAuthPromise = null;
  let firebaseSignOutPromise = null;

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

  function readFirebaseConfig() {
    const fromGlobal = runtimeScope[FIREBASE_CONFIG_GLOBAL_KEY];
    if (fromGlobal && typeof fromGlobal === 'object') return fromGlobal;

    try {
      const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
    return null;
  }

  function hasValidFirebaseConfig(config) {
    if (!config || typeof config !== 'object') return false;
    return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') return reject(new Error('Document unavailable.'));
      const existing = document.querySelector(`script[data-arrowchat-src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed loading ${src}`)), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.arrowchatSrc = src;
      script.addEventListener('load', () => {
        script.dataset.loaded = '1';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Failed loading ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureFirebaseAuth() {
    if (firebaseAuthPromise) return firebaseAuthPromise;
    firebaseAuthPromise = (async () => {
      const config = readFirebaseConfig();
      if (!hasValidFirebaseConfig(config)) return null;
      await loadScriptOnce(FIREBASE_APP_CDN);
      await loadScriptOnce(FIREBASE_AUTH_CDN);
      const fb = runtimeScope.firebase;
      if (!fb || typeof fb.initializeApp !== 'function' || typeof fb.auth !== 'function') return null;
      const app = (fb.apps && fb.apps.length) ? fb.apps[0] : fb.initializeApp(config);
      return fb.auth(app);
    })().catch(() => null);
    return firebaseAuthPromise;
  }

  function firebaseUserToPayload(user, fallbackUsername = 'You') {
    const username = normalizeUsername(user?.displayName || fallbackUsername || user?.email?.split('@')[0] || 'You');
    const email = String(user?.email || '').trim().toLowerCase();
    return {
      type: 'account',
      sub: String(user?.uid || secureRandomId('acct')),
      username,
      email,
    };
  }

  function friendlyFirebaseError(err, fallbackMessage) {
    const code = String(err?.code || '');
    if (code === 'auth/invalid-email') return 'Invalid email address.';
    if (code === 'auth/user-not-found') return 'No account found with that email.';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Incorrect email or password.';
    if (code === 'auth/email-already-in-use') return 'An account with this email already exists. Please sign in.';
    if (code === 'auth/weak-password') return PASSWORD_COMPLEXITY_MESSAGE;
    if (code === 'auth/requires-recent-login') return 'Please sign in again before changing account email or password.';
    return err?.message || fallbackMessage;
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
    let expected = null;
    try {
      expected = await sign(`${h}.${p}`);
    } catch (err) {
      if (isSecureCryptoUnavailableError(err)) return null;
      throw err;
    }
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
    if (firebaseSignOutPromise) await firebaseSignOutPromise;
    const token = localStorage.getItem(TOKEN_KEY);
    const payload = await verifyToken(token);
    if (payload) return { token, payload };

    localStorage.removeItem(TOKEN_KEY);
    const firebaseAuth = await ensureFirebaseAuth();
    const firebaseUser = firebaseAuth && firebaseAuth.currentUser;
    if (!firebaseUser) return null;
    return setSession(firebaseUserToPayload(firebaseUser));
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
    const cleanUsername = normalizeUsername(username);
    const firebaseAuth = await ensureFirebaseAuth();

    if (firebaseAuth) {
      try {
        let user = firebaseAuth.currentUser;
        if (!user) {
          if (!password) throw new Error('Password is required to create a Firebase account.');
          if (!passwordIsStrong(password)) throw new Error(PASSWORD_COMPLEXITY_MESSAGE);
          const cred = await firebaseAuth.createUserWithEmailAndPassword(cleanEmail, String(password));
          user = cred.user;
        } else {
          if (cleanEmail !== String(user.email || '').trim().toLowerCase() && typeof user.updateEmail === 'function') {
            await user.updateEmail(cleanEmail);
          }
          if (password) {
            if (!passwordIsStrong(password)) throw new Error(PASSWORD_COMPLEXITY_MESSAGE);
            if (typeof user.updatePassword === 'function') await user.updatePassword(String(password));
          }
        }

        if (cleanUsername && typeof user.updateProfile === 'function') {
          await user.updateProfile({ displayName: cleanUsername });
        }
        if (typeof user.reload === 'function') await user.reload();
        const activeUser = firebaseAuth.currentUser || user;
        return setSession(firebaseUserToPayload(activeUser, cleanUsername));
      } catch (err) {
        throw new Error(friendlyFirebaseError(err, 'Could not save account.'));
      }
    }

    const users = loadUsers();
    const now = Date.now();
    let user = users.find((u) => u.email === cleanEmail);

    if (!user) {
      if (!passwordIsStrong(password)) throw new Error(PASSWORD_COMPLEXITY_MESSAGE);
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
        if (!passwordIsStrong(password)) throw new Error(PASSWORD_COMPLEXITY_MESSAGE);
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
    const firebaseAuth = await ensureFirebaseAuth();

    if (firebaseAuth) {
      try {
        const cred = await firebaseAuth.signInWithEmailAndPassword(cleanEmail, String(password));
        return setSession(firebaseUserToPayload(cred.user));
      } catch (err) {
        throw new Error(friendlyFirebaseError(err, 'Could not sign in.'));
      }
    }

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
    if (!passwordIsStrong(password)) throw new Error(PASSWORD_COMPLEXITY_MESSAGE);
    const cleanUsername = normalizeUsername(username) || cleanEmail.split('@')[0].slice(0, 32);
    const firebaseAuth = await ensureFirebaseAuth();

    if (firebaseAuth) {
      try {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(cleanEmail, String(password));
        if (typeof cred.user?.updateProfile === 'function') {
          await cred.user.updateProfile({ displayName: cleanUsername });
          if (typeof cred.user.reload === 'function') await cred.user.reload();
        }
        const activeUser = firebaseAuth.currentUser || cred.user;
        return setSession(firebaseUserToPayload(activeUser, cleanUsername));
      } catch (err) {
        throw new Error(friendlyFirebaseError(err, 'Could not create account.'));
      }
    }

    const users = loadUsers();
    if (users.find((u) => u.email === cleanEmail)) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

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

  async function logout() {
    localStorage.removeItem(TOKEN_KEY);
    const firebaseAuth = await ensureFirebaseAuth();
    if (!firebaseAuth || typeof firebaseAuth.signOut !== 'function') return;
    if (!firebaseSignOutPromise) {
      firebaseSignOutPromise = firebaseAuth.signOut().catch(() => {}).finally(() => {
        firebaseSignOutPromise = null;
      });
    }
    await firebaseSignOutPromise;
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
