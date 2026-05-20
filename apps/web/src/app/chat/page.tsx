"use client";

import Link from "next/link";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/context/ChatContext";
import { Globe, Radio } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function GlobalChatPage() {
  const { user } = useAuth();
  const { globalMessages, sendGlobal, wsStatus } = useChat();

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/30">
        <Link className="underline" href="/login">
          Sign in
        </Link>
        <span className="ml-1">to join global chat.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
        <Globe size={16} className="text-white/50" />
        <h2 className="text-sm font-semibold text-white/80">Global Chat</h2>
        <span
          className={`ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${
            wsStatus === "open" ? "text-white/50" : "text-white/20"
          }`}
        >
          <Radio size={10} />
          {wsStatus === "open"
            ? "Live"
            : wsStatus === "connecting"
              ? "Connecting…"
              : "Offline"}
        </span>
      </header>

      <MessageList messages={globalMessages} />

      <ChatInput onSend={(content) => void sendGlobal(content)} placeholder="Message #global…" />
    </div>
  );
}
