"use client";

import { useState, KeyboardEvent } from "react";
import { Send, Volume2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  onSend: (content: string) => void;
  placeholder?: string;
}

export function ChatInput({ onSend, placeholder = "Message..." }: Props) {
  const [value, setValue] = useState("");
  const { user } = useAuth();
  const isPremium = user?.tier === "premium" || user?.tier === "staff";

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-white/10 bg-black/50 px-4 py-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/25 outline-none focus:border-white/30 focus:ring-0 transition-colors"
        style={{ maxHeight: "120px" }}
      />

      {/* TTS toggle — premium only */}
      {isPremium && (
        <button
          title="Text-to-speech (Premium)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/40 transition hover:border-white/30 hover:text-white/80"
        >
          <Volume2 size={15} />
        </button>
      )}

      <button
        onClick={handleSend}
        disabled={!value.trim()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white/80 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Send size={15} />
      </button>
    </div>
  );
}
