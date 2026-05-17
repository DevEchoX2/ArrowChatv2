const DEFAULT_LOCAL_BACKEND_PORT = "3001";

function getRuntimeConfigObject() {
  const cfg = window.__APP_RUNTIME_CONFIG__ || window.__ARROWCHAT_FIREBASE_CONFIG__ || null;
  return cfg && typeof cfg === "object" ? cfg : null;
}

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    new URL(raw, window.location.origin);
    return raw.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function getFirebaseRuntimeConfig() {
  return getRuntimeConfigObject();
}

export function getApiBaseUrl() {
  const cfg = getRuntimeConfigObject();
  const fromConfig = normalizeBaseUrl(cfg?.apiBaseUrl || "");
  if (fromConfig) return fromConfig;

  const fromWindow = normalizeBaseUrl(window.__APP_API_BASE_URL__);
  if (fromWindow) return fromWindow;

  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const currentPort = String(window.location.port || "");
  if (isLocalHost && currentPort && currentPort !== DEFAULT_LOCAL_BACKEND_PORT) {
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_LOCAL_BACKEND_PORT}`;
  }

  return "";
}
