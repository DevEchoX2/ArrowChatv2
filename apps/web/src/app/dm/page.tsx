"use client";

import Link from "next/link";
import { DmSidebar } from "@/components/DmSidebar";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/context/ChatContext";
import { useCall } from "@/context/CallContext";
import { Mail, Phone, Video } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DirectMessagesPage() {
  const { user } = useAuth();
  const { dmPreviews, activeDmUserId, dmMessages, sendDM } = useChat();
  const { status: callStatus, startCall } = useCall();

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/30">
        <Link className="underline" href="/login">
          Sign in
        </Link>
        <span className="ml-1">to use direct messages.</span>
      </div>
    );
  }

  const activeDm = dmPreviews.find((u) => u.userId === activeDmUserId);
  const messages = activeDmUserId ? (dmMessages[activeDmUserId] ?? []) : [];
  const callDisabled = callStatus !== "idle";
  const callPeer = activeDm
    ? {
        userId: activeDm.userId,
        displayName: activeDm.displayName,
        username: activeDm.username,
        avatarUrl: activeDm.avatarUrl,
        isOnline: activeDm.isOnline,
      }
    : null;

  return (
    <div className="flex flex-1 overflow-hidden">
      <DmSidebar previews={dmPreviews} />

      {activeDm ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
            <Mail size={16} className="text-white/50" />
            <h2 className="text-sm font-semibold text-white/80">
              {activeDm.displayName}
            </h2>
            <span className="text-[11px] text-white/30">@{activeDm.username}</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => callPeer && void startCall(callPeer, "audio")}
                disabled={callDisabled}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${
                  callDisabled
                    ? "border-white/5 bg-white/5 text-white/30"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
                aria-label="Start audio call"
              >
                <Phone size={12} />
                Call
              </button>
              <button
                onClick={() => callPeer && void startCall(callPeer, "video")}
                disabled={callDisabled}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${
                  callDisabled
                    ? "border-white/5 bg-white/5 text-white/30"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
                aria-label="Start video call"
              >
                <Video size={12} />
                Video
              </button>
            </div>
          </header>

          <MessageList messages={messages} />
          <ChatInput
            onSend={(content) => void sendDM(activeDm.userId, content)}
            placeholder={`Message ${activeDm.displayName}…`}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-white/20">
          Select a conversation to start messaging.
        </div>
      )}
    </div>
  );
}
