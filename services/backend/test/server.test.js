import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";

const BASE_ENV = {
  NODE_ENV: "test",
  PRIVATE_ACCESS_PASSWORD: "very-secure-password",
  SESSION_SECRET: "12345678901234567890123456789012",
  COOKIE_SECURE: "false"
};

function cookieFromLogin(response) {
  const setCookie = response.headers["set-cookie"];
  if (Array.isArray(setCookie)) {
    assert.ok(setCookie[0]);
    return setCookie[0].split(";")[0];
  }
  assert.ok(typeof setCookie === "string" && setCookie.length > 0);
  return setCookie.split(";")[0];
}

async function login(app) {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/auth/session",
    payload: { password: BASE_ENV.PRIVATE_ACCESS_PASSWORD, userId: "owner" }
  });
  assert.equal(loginResponse.statusCode, 200);
  return cookieFromLogin(loginResponse);
}

test("session auth works for /api/me", async () => {
  const { app } = await createApp({ env: BASE_ENV });
  try {
    const cookie = await login(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().userId, "owner");
  } finally {
    await app.close();
  }
});

test("idempotent message post and paginated reads", async () => {
  const { app } = await createApp({ env: BASE_ENV });
  try {
    const cookie = await login(app);

    const first = await app.inject({
      method: "POST",
      url: "/api/messages",
      headers: { cookie, "idempotency-key": "msg-1" },
      payload: { text: "one" }
    });

    const replay = await app.inject({
      method: "POST",
      url: "/api/messages",
      headers: { cookie, "idempotency-key": "msg-1" },
      payload: { text: "one" }
    });

    assert.equal(first.statusCode, 200);
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.json().id, first.json().id);
    assert.equal(replay.json().idempotentReplay, true);

    await app.inject({
      method: "POST",
      url: "/api/messages",
      headers: { cookie },
      payload: { text: "two" }
    });

    await app.inject({
      method: "POST",
      url: "/api/messages",
      headers: { cookie },
      payload: { text: "three" }
    });

    const page1 = await app.inject({
      method: "GET",
      url: "/api/messages?v=2&limit=2",
      headers: { cookie }
    });

    assert.equal(page1.statusCode, 200);
    assert.equal(page1.json().items.length, 2);
    assert.equal(page1.json().hasMore, true);

    const page2 = await app.inject({
      method: "GET",
      url: `/api/messages?v=2&limit=2&before=${page1.json().nextBefore}`,
      headers: { cookie }
    });

    assert.equal(page2.statusCode, 200);
    assert.ok(page2.json().items.length >= 1);
  } finally {
    await app.close();
  }
});

test("/api/ready returns 503 for invalid production runtime config", async () => {
  const { app } = await createApp({
    env: {
      NODE_ENV: "production",
      PRIVATE_ACCESS_PASSWORD: "change-this-password",
      SESSION_SECRET: "replace-with-session-secret",
      COOKIE_SECURE: "false"
    }
  });

  try {
    const response = await app.inject({ method: "GET", url: "/api/ready" });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().ok, false);
  } finally {
    await app.close();
  }
});
