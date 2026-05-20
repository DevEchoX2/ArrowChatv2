"use client";

import React, { useRef, useEffect } from "react";
import { ChatMessage } from "@/lib/types";
import { UserAvatar } from "./UserAvatar";
import { BadgeChip } from "./BadgeChip";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateHeader(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

interface Props {
  messages: ChatMessage[];
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group messages by date
  const groups: { date: string; msgs: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const date = new Date(msg.timestamp).toDateString();
    const last = groups[groups.length - 1];
    if (last?.date === date) {
      last.msgs.push(msg);
    } else {
      groups.push({ date, msgs: [msg] });
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-2 space-y-1">
      {groups.map((group) => (
        <React.Fragment key={group.date}>
          {/* Date divider */}
          <div className="flex items-center gap-3 py-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="shrink-0 text-[11px] text-white/30 uppercase tracking-widest">
              {formatDateHeader(group.msgs[0].timestamp)}
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {group.msgs.map((msg) => (
            <div key={msg.id} className="group flex gap-3 rounded px-2 py-1.5 hover:bg-white/[0.03]">
              <UserAvatar
                user={{
                  displayName: msg.authorName,
                  avatarUrl: msg.authorAvatar,
                  tier: msg.authorTier,
                  isOnline: false,
                }}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white/90 leading-none">
                    {msg.authorName}
                  </span>
                  {(msg.authorTier === "premium" ||
                    msg.authorTier === "staff") && (
                    <BadgeChip
                      badge={{
                        id: msg.authorTier,
                        type: msg.authorTier,
                        label: msg.authorTier === "staff" ? "Staff" : "Premium",
                      }}
                    />
                  )}
                  <span className="text-[11px] text-white/25 group-hover:text-white/40">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-white/70 break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
