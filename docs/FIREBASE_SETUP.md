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
The frontend reads runtime config from `window.__ARROWCHAT_FIREBASE_CONFIG__`.

Create a file like `apps/web/config.local.js` (do not commit):

```js
window.__ARROWCHAT_FIREBASE_CONFIG__ = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Then include it before `src/main.js` in `index.html` for local testing.

## Deploy rules
Use files in `/home/runner/work/ArrowChatv2/ArrowChatv2/infra/firebase`:
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
