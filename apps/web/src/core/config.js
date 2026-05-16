export function getFirebaseRuntimeConfig() {
  return window.__APP_RUNTIME_CONFIG__ || window.__ARROWCHAT_FIREBASE_CONFIG__ || null;
}
