import { Badge, User, DMPreview, ChatMessage } from "./types";

// ─── Mock seed data used across the app during development ──────────────────

export const MOCK_CURRENT_USER: User = {
  id: "u_current",
  username: "you",
  displayName: "You",
  avatarUrl: undefined,
  bio: "Just testing ArrowChat.",
  tier: "free",
  badges: [],
  socialLinks: [],
  profileTheme: {
    backgroundType: "solid",
    backgroundColor: "#0a0a0a",
    accentColor: "#ffffff",
  },
  createdAt: new Date().toISOString(),
  isOnline: true,
};

export const MOCK_USERS: User[] = [
  {
    id: "u_1",
    username: "ghost",
    displayName: "Ghost",
    avatarUrl: undefined,
    bio: "Premium user · haunt.gg vibes",
    tier: "premium",
    badges: [{ id: "b1", type: "premium", label: "Premium" }],
    socialLinks: [
      {
        id: "sl1",
        platform: "github",
        label: "github",
        url: "https://github.com",
        visible: true,
        order: 0,
      },
      {
        id: "sl2",
        platform: "twitter",
        label: "twitter",
        url: "https://twitter.com",
        visible: true,
        order: 1,
      },
    ],
    profileTheme: {
      backgroundType: "gradient",
      backgroundColor: "#000000",
      accentColor: "#ffffff",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    isOnline: true,
  },
  {
    id: "u_2",
    username: "echo",
    displayName: "Echo",
    avatarUrl: undefined,
    bio: "Staff member",
    tier: "staff",
    badges: [
      { id: "b2", type: "staff", label: "Staff" },
      { id: "b3", type: "verified", label: "Verified" },
    ],
    socialLinks: [],
    profileTheme: {
      backgroundType: "solid",
      backgroundColor: "#000000",
      accentColor: "#ffffff",
    },
    createdAt: "2023-06-01T00:00:00.000Z",
    isOnline: false,
  },
];

export const MOCK_GLOBAL_MESSAGES: ChatMessage[] = [
  {
    id: "m_1",
    authorId: "u_2",
    authorName: "Echo",
    authorTier: "staff",
    content: "Welcome to ArrowChat global chat!",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "m_2",
    authorId: "u_1",
    authorName: "Ghost",
    authorTier: "premium",
    content: "Love the new design.",
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
];

export const MOCK_DM_PREVIEWS: DMPreview[] = [
  {
    id: "dm_1",
    userId: "u_1",
    username: "ghost",
    displayName: "Ghost",
    avatarUrl: undefined,
    isOnline: true,
    lastMessage: "Love the new design.",
    lastActivity: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    unreadCount: 1,
  },
  {
    id: "dm_2",
    userId: "u_2",
    username: "echo",
    displayName: "Echo",
    avatarUrl: undefined,
    isOnline: false,
    lastMessage: "Welcome to ArrowChat global chat!",
    lastActivity: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unreadCount: 0,
  },
];

export const TIER_BADGE_LABELS: Record<string, string> = {
  free: "",
  premium: "Premium",
  staff: "Staff",
};

export const STAFF_BADGE: Badge = {
  id: "staff",
  type: "staff",
  label: "Staff",
};

export const PREMIUM_BADGE: Badge = {
  id: "premium",
  type: "premium",
  label: "Premium",
};
