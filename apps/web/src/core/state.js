import { loadJSON, saveJSON } from "../lib/storage.js";

const DEFAULT_STATE = {
  currentUser: { id: "local-user", email: "you@example.com", displayName: "You" },
  activeView: "global",
  preferences: loadJSON("arrowchat.preferences", {
    theme: "yin-yang",
    globalBg: ""
  }),
  globalMessages: loadJSON("arrowchat.globalMessages", [
    { id: "g1", sender: "System", text: "Welcome to ArrowChat Global.", pinned: true },
    { id: "g2", sender: "Alex", text: "Hi everyone!", pinned: false }
  ]),
  dms: loadJSON("arrowchat.dms", [
    { id: "d1", user: "Sam", unread: 2, messages: [{ id: "d1m1", sender: "Sam", text: "Yo!", read: false }] }
  ]),
  channels: loadJSON("arrowchat.channels", [
    { id: "c1", name: "General", memberCount: 3, unread: 1 },
    { id: "c2", name: "Design", memberCount: 2, unread: 0 }
  ]),
  reactions: loadJSON("arrowchat.reactions", [
    { id: "r1", messageId: "g2", chatId: "global", emoji: "🔥", count: 2 },
    { id: "r2", messageId: "d1m1", chatId: "d1", emoji: "👍", count: 1 }
  ]),
  readReceipts: loadJSON("arrowchat.readReceipts", [
    { id: "rr1", messageId: "d1m1", chatId: "d1", userId: "local-user", readAt: Date.now() }
  ]),
  moderationQueue: loadJSON("arrowchat.moderationQueue", [
    { id: "mq1", messageId: "g2", reason: "spam", status: "open", reporter: "alex" }
  ]),
  searchIndex: loadJSON("arrowchat.searchIndex", [
    { scope: "global", text: "Welcome to ArrowChat Global." },
    { scope: "dm:Sam", text: "Yo!" }
  ]),
  presence: loadJSON("arrowchat.presence", [
    { userId: "local-user", name: "You", status: "online", typingIn: "" },
    { userId: "sam", name: "Sam", status: "away", typingIn: "d1" }
  ]),
  notifications: loadJSON("arrowchat.notifications", [
    { id: "n1", type: "system", text: "Your account is ready.", read: false }
  ]),
  friends: loadJSON("arrowchat.friends", [{ id: "f1", name: "Sam", status: "accepted" }]),
  blocked: loadJSON("arrowchat.blocked", [])
};

let state = DEFAULT_STATE;

export function getState() {
  return state;
}

export function setState(next) {
  state = { ...state, ...next };
  saveJSON("arrowchat.preferences", state.preferences);
  saveJSON("arrowchat.globalMessages", state.globalMessages);
  saveJSON("arrowchat.dms", state.dms);
  saveJSON("arrowchat.channels", state.channels);
  saveJSON("arrowchat.reactions", state.reactions);
  saveJSON("arrowchat.readReceipts", state.readReceipts);
  saveJSON("arrowchat.moderationQueue", state.moderationQueue);
  saveJSON("arrowchat.searchIndex", state.searchIndex);
  saveJSON("arrowchat.presence", state.presence);
  saveJSON("arrowchat.notifications", state.notifications);
  saveJSON("arrowchat.friends", state.friends);
  saveJSON("arrowchat.blocked", state.blocked);
}
