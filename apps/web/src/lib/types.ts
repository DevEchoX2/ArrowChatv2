// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserTier = "free" | "premium" | "staff";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  tier: UserTier;
  badges: Badge[];
  socialLinks: SocialLink[];
  profileTheme: ProfileTheme;
  createdAt: string;
  isOnline: boolean;
}

// ─── Badges ─────────────────────────────────────────────────────────────────

export type BadgeType =
  | "verified"
  | "premium"
  | "staff"
  | "founder"
  | "early_adopter"
  | "custom";

export interface Badge {
  id: string;
  type: BadgeType;
  label: string;
  icon?: string; // lucide icon name
}

// ─── Social Links ────────────────────────────────────────────────────────────

export type SocialPlatform =
  | "twitter"
  | "instagram"
  | "github"
  | "youtube"
  | "twitch"
  | "discord"
  | "spotify"
  | "tiktok"
  | "custom";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  icon?: string;
  visible: boolean;
  order: number;
}

// ─── Profile Theme (Premium) ─────────────────────────────────────────────────

export interface ProfileTheme {
  backgroundType: "solid" | "gradient" | "animated"; // animated = premium
  backgroundColor: string;
  accentColor: string;
  fontFamily?: string;
  customSubdomain?: string; // premium
  embedMedia?: EmbedMedia;  // premium
}

export interface EmbedMedia {
  type: "spotify" | "soundcloud" | "youtube";
  url: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorTier: UserTier;
  content: string;
  timestamp: string;
  tts?: boolean; // premium: text-to-speech
}

export interface DirectMessage {
  id: string;
  participants: [string, string]; // [userId1, userId2]
  messages: ChatMessage[];
  lastActivity: string;
}

export interface DMPreview {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastMessage: string;
  lastActivity: string;
  unreadCount: number;
}

// ─── Stripe / Premium ────────────────────────────────────────────────────────

export type PremiumPlan = "monthly" | "annual";

export interface CheckoutSession {
  plan: PremiumPlan;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}
