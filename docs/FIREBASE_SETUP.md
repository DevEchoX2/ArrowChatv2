# Firebase Setup (you do this in Firebase Console)

1. Create **three projects**: `arrowchat-dev`, `arrowchat-staging`, `arrowchat-prod`.
2. In each project, enable:
   - Authentication (Email/Password minimum)
   - Firestore (production mode)
   - Storage
   - Optional: Cloud Messaging
3. Register a Web App and copy config values.
4. Set authorized domains in Auth.
5. Keep config outside source code; use environment-specific config injection.

## Client config contract
The frontend reads runtime config from `window.__APP_RUNTIME_CONFIG__` (legacy fallback: `window.__ARROWCHAT_FIREBASE_CONFIG__`).

Inject runtime config in your deployment template (recommended) or add a local script before `src/main.js`:

```html
<script>
window.__APP_RUNTIME_CONFIG__ = { /* values */ };
</script>
```

Local file option (`apps/web/config.local.js`, do not commit):

```js
window.__APP_RUNTIME_CONFIG__ = {
  apiBaseUrl: "http://localhost:3001",
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

This object must be present before `src/main.js` executes.
`apiBaseUrl` is optional and can be used when the web app is served from a different origin than the backend.

## Deploy rules
Use files in `infra/firebase`:
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
