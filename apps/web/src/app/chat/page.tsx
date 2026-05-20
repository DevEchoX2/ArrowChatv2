"use client";

import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/context/ChatContext";
import { Globe, Radio } from "lucide-react";

export default function GlobalChatPage() {
  const { globalMessages, sendGlobal, wsStatus } = useChat();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
        <Globe size={16} className="text-white/50" />
        <h2 className="text-sm font-semibold text-white/80">Global Chat</h2>
        <span
          className={`ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${
            wsStatus === "open" ? "text-white/50" : "text-white/20"
          }`}
        >
          <Radio size={10} />
          {wsStatus === "open" ? "Live" : wsStatus === "connecting" ? "Connecting…" : "Offline"}
        </span>
      </header>

      {/* Messages */}
      <MessageList messages={globalMessages} />

      {/* Input */}
      <ChatInput onSend={sendGlobal} placeholder="Message #global…" />
    </div>
  );
}
