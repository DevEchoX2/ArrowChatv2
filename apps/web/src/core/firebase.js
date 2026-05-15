import { getFirebaseRuntimeConfig } from "./config.js";

export function getFirebaseStatus() {
  const cfg = getFirebaseRuntimeConfig();
  if (!cfg) {
    return { enabled: false, mode: "local-fallback" };
  }

  const required = ["apiKey", "authDomain", "projectId", "appId"];
  const complete = required.every((k) => typeof cfg[k] === "string" && cfg[k].length > 0);
  return { enabled: complete, mode: complete ? "firebase" : "invalid-config" };
}
