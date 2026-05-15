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
    { id: "d1", user: "Sam", unread: 2, messages: [{ sender: "Sam", text: "Yo!" }] }
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
  saveJSON("arrowchat.notifications", state.notifications);
  saveJSON("arrowchat.friends", state.friends);
  saveJSON("arrowchat.blocked", state.blocked);
}
