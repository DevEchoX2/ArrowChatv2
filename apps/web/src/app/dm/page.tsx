"use client";

import { DmSidebar } from "@/components/DmSidebar";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/context/ChatContext";
import { MOCK_USERS } from "@/lib/mockData";
import { Mail } from "lucide-react";

export default function DirectMessagesPage() {
  const { dmPreviews, activeDmUserId, dmMessages, sendDM } = useChat();

  const activeDmUser = MOCK_USERS.find((u) => u.id === activeDmUserId);
  const messages = activeDmUserId ? (dmMessages[activeDmUserId] ?? []) : [];

  return (
    <div className="flex flex-1 overflow-hidden">
      <DmSidebar previews={dmPreviews} />

      {activeDmUser ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
            <Mail size={16} className="text-white/50" />
            <h2 className="text-sm font-semibold text-white/80">
              {activeDmUser.displayName}
            </h2>
            <span className="text-[11px] text-white/30">
              @{activeDmUser.username}
            </span>
          </header>

          <MessageList messages={messages} />
          <ChatInput
            onSend={(content) => sendDM(activeDmUser.id, content)}
            placeholder={`Message ${activeDmUser.displayName}…`}
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
