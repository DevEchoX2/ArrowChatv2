"use client";

import { DMPreview } from "@/lib/types";
import { UserAvatar } from "./UserAvatar";
import { useChat } from "@/context/ChatContext";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

interface Props {
  previews: DMPreview[];
}

export function DmSidebar({ previews }: Props) {
  const { activeDmUserId, openDM } = useChat();

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-black">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
          Direct Messages
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {previews.length === 0 && (
          <p className="px-4 py-6 text-xs text-white/20">
            No conversations yet.
          </p>
        )}
        {previews.map((dm) => (
          <button
            key={dm.id}
            onClick={() => void openDM(dm.userId)}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
              activeDmUserId === dm.userId ? "bg-white/8" : ""
            }`}
          >
            <UserAvatar
              user={{
                displayName: dm.displayName,
                avatarUrl: dm.avatarUrl,
                tier: "free",
                isOnline: dm.isOnline,
              }}
              size="sm"
              showStatus
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-xs font-semibold text-white/80">
                  {dm.displayName}
                </span>
                <span className="ml-2 shrink-0 text-[10px] text-white/25">
                  {timeAgo(dm.lastActivity)}
                </span>
              </div>
              <p className="truncate text-[11px] text-white/30">
                {dm.lastMessage}
              </p>
            </div>
            {dm.unreadCount > 0 && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-bold text-black">
                {dm.unreadCount > 9 ? "9+" : dm.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
