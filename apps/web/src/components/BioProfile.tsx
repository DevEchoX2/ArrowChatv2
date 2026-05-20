"use client";

import Link from "next/link";
import { ExternalLink, Code2, Share2, Play, Video, MessageSquare, Music, Music4 } from "lucide-react";
import { User } from "@/lib/types";
import { UserAvatar } from "./UserAvatar";
import { BadgeChip } from "./BadgeChip";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  github: <Code2 size={14} />,
  twitter: <Share2 size={14} />,
  youtube: <Play size={14} />,
  twitch: <Video size={14} />,
  discord: <MessageSquare size={14} />,
  spotify: <Music size={14} />,
  tiktok: <Music4 size={14} />,
  instagram: <Share2 size={14} />,
  custom: <ExternalLink size={14} />,
};

interface Props {
  user: User;
  editable?: boolean;
}

export function BioProfile({ user }: Props) {
  const visibleLinks = user.socialLinks
    .filter((l) => l.visible)
    .sort((a, b) => a.order - b.order);

  const isAnimated = user.tier === "premium" && user.profileTheme.backgroundType === "animated";

  return (
    <article
      className={`relative flex flex-col items-center rounded-xl border border-white/10 p-6 text-center ${
        isAnimated ? "animated-bg" : ""
      }`}
      style={{ background: user.profileTheme.backgroundColor }}
    >
      {/* Avatar */}
      <div className="mb-3">
        <UserAvatar user={user} size="lg" showStatus />
      </div>

      {/* Display name */}
      <h1 className="text-lg font-bold text-white leading-tight">
        {user.displayName}
      </h1>
      <p className="text-xs text-white/40">@{user.username}</p>

      {/* Badges */}
      {user.badges.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {user.badges.map((b) => (
            <BadgeChip key={b.id} badge={b} />
          ))}
        </div>
      )}

      {/* Bio */}
      {user.bio && (
        <p className="mt-3 max-w-xs text-sm text-white/60">{user.bio}</p>
      )}

      {/* Social links */}
      {visibleLinks.length > 0 && (
        <div className="mt-4 flex w-full flex-col gap-2">
          {visibleLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              {PLATFORM_ICONS[link.platform] ?? PLATFORM_ICONS.custom}
              {link.label}
            </a>
          ))}
        </div>
      )}

      {/* Embedded media – premium */}
      {user.tier === "premium" && user.profileTheme.embedMedia && (
        <div className="mt-4 w-full overflow-hidden rounded-md border border-white/10">
          <iframe
            src={user.profileTheme.embedMedia.url}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen"
            className="h-20 w-full"
            title="Embedded media"
          />
        </div>
      )}

      {/* Visit button */}
      <Link
        href={`/${user.username}`}
        className="mt-4 text-[10px] text-white/20 hover:text-white/50 transition-colors"
      >
        arrowchat.app/{user.username}
      </Link>
    </article>
  );
}
