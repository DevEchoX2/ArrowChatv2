const commandLines = [
  {
    name: "/help",
    description: "List all available commands.",
    example: "/help"
  },
  {
    name: "/join",
    description: "Join a public room.",
    example: "/join World-chat"
  },
  {
    name: "/rules",
    description: "Show server rules.",
    example: "/rules"
  },
  {
    name: "/dm",
    description: "Open a direct message with a user.",
    example: "/dm username"
  },
  {
    name: "/create",
    description: "Create a private room (max 15 members).",
    example: "/create my-room"
  }
];

window.ArrowChatCommandLines = commandLines;
