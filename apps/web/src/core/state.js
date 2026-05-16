import { loadJSON, saveJSON } from "../lib/storage.js";

const DEFAULT_STATE = {
  currentUser: { id: "local-user", email: "you@example.com", displayName: "You" },
  activeView: "global",
  preferences: loadJSON("workspace.preferences", {
    theme: "yin-yang",
    globalBg: ""
  }),
  globalMessages: loadJSON("workspace.globalMessages", [
    { id: "g1", sender: "System", text: "Welcome to the private lobby.", pinned: true },
    { id: "g2", sender: "Alex", text: "Hi everyone!", pinned: false }
  ]),
  dms: loadJSON("workspace.dms", [
    { id: "d1", user: "Sam", unread: 2, messages: [{ id: "d1m1", sender: "Sam", text: "Yo!", read: false }] }
  ]),
  channels: loadJSON("workspace.channels", [
    { id: "c1", name: "General", memberCount: 3, unread: 1 },
    { id: "c2", name: "Design", memberCount: 2, unread: 0 }
  ]),
  reactions: loadJSON("workspace.reactions", [
    { id: "r1", messageId: "g2", chatId: "global", emoji: "🔥", count: 2 },
    { id: "r2", messageId: "d1m1", chatId: "d1", emoji: "👍", count: 1 }
  ]),
  readReceipts: loadJSON("workspace.readReceipts", [
    { id: "rr1", messageId: "d1m1", chatId: "d1", userId: "local-user", readAt: Date.now() }
  ]),
  moderationQueue: loadJSON("workspace.moderationQueue", [
    { id: "mq1", messageId: "g2", reason: "spam", status: "open", reporter: "alex" }
  ]),
  searchIndex: loadJSON("workspace.searchIndex", [
    { scope: "global", text: "Welcome to the private lobby." },
    { scope: "dm:Sam", text: "Yo!" }
  ]),
  presence: loadJSON("workspace.presence", [
    { userId: "local-user", name: "You", status: "online", typingIn: "" },
    { userId: "sam", name: "Sam", status: "away", typingIn: "d1" }
  ]),
  notifications: loadJSON("workspace.notifications", [
    { id: "n1", type: "system", text: "Your account is ready.", read: false }
  ]),
  friends: loadJSON("workspace.friends", [{ id: "f1", name: "Sam", status: "accepted" }]),
  blocked: loadJSON("workspace.blocked", [])
};

let state = DEFAULT_STATE;

export function getState() {
  return state;
}

export function setState(next) {
  state = { ...state, ...next };
  saveJSON("workspace.preferences", state.preferences);
  saveJSON("workspace.globalMessages", state.globalMessages);
  saveJSON("workspace.dms", state.dms);
  saveJSON("workspace.channels", state.channels);
  saveJSON("workspace.reactions", state.reactions);
  saveJSON("workspace.readReceipts", state.readReceipts);
  saveJSON("workspace.moderationQueue", state.moderationQueue);
  saveJSON("workspace.searchIndex", state.searchIndex);
  saveJSON("workspace.presence", state.presence);
  saveJSON("workspace.notifications", state.notifications);
  saveJSON("workspace.friends", state.friends);
  saveJSON("workspace.blocked", state.blocked);
}
