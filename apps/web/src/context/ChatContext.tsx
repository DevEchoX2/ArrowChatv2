"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ChatMessage, DMPreview } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { getBrowserSupabaseClient } from "@/lib/supabase";

interface ChatContextValue {
  globalMessages: ChatMessage[];
  dmPreviews: DMPreview[];
  activeDmUserId: string | null;
  dmMessages: Record<string, ChatMessage[]>;
  sendGlobal: (content: string) => Promise<void>;
  sendDM: (toUserId: string, content: string) => Promise<void>;
  openDM: (userId: string) => Promise<void>;
  wsStatus: "connecting" | "open" | "closed";
}

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  thread_type: "global" | "dm";
  content: string;
  tts: boolean;
  created_at: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    tier: "free" | "premium" | "staff";
  };
}

const ChatContext = createContext<ChatContextValue | null>(null);

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    authorId: row.sender_id,
    authorName: row.sender?.display_name ?? row.sender?.username ?? "Unknown",
    authorAvatar: row.sender?.avatar_url ?? undefined,
    authorTier: row.sender?.tier ?? "free",
    content: row.content,
    timestamp: row.created_at,
    tts: row.tts,
  };
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabaseClient();
  const { user, session } = useAuth();

  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [dmPreviews, setDmPreviews] = useState<DMPreview[]>([]);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<Record<string, ChatMessage[]>>({});
  const [wsStatus, setWsStatus] = useState<"connecting" | "open" | "closed">(
    "closed"
  );

  const activeDmUserIdRef = useRef<string | null>(null);
  const globalChannelRef = useRef<RealtimeChannel | null>(null);
  const dmChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    activeDmUserIdRef.current = activeDmUserId;
  }, [activeDmUserId]);

  const authHeaders = useCallback(() => {
    const token = session?.access_token;
    if (!token) throw new Error("No active session");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    } as const;
  }, [session?.access_token]);

  const loadGlobalMessages = useCallback(async () => {
    if (!session?.access_token) {
      setGlobalMessages([]);
      return;
    }

    const res = await fetch("/api/chat/global?limit=100", {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load global messages");
    const payload = (await res.json()) as { messages: ChatMessage[] };
    setGlobalMessages(payload.messages);
  }, [authHeaders, session?.access_token]);

  const loadDmPreviews = useCallback(async () => {
    if (!session?.access_token) {
      setDmPreviews([]);
      return;
    }

    const res = await fetch("/api/chat/dms", {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load DM previews");
    const payload = (await res.json()) as { conversations: DMPreview[] };
    setDmPreviews(payload.conversations);
  }, [authHeaders, session?.access_token]);

  const loadDmMessages = useCallback(
    async (otherUserId: string) => {
      const res = await fetch(`/api/chat/dms/${otherUserId}?limit=100`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load DM messages");
      const payload = (await res.json()) as { messages: ChatMessage[] };
      setDmMessages((prev) => ({ ...prev, [otherUserId]: payload.messages }));
    },
    [authHeaders]
  );

  useEffect(() => {
    if (!supabase || !user || !session?.access_token) {
      globalChannelRef.current?.unsubscribe();
      dmChannelRef.current?.unsubscribe();
      globalChannelRef.current = null;
      dmChannelRef.current = null;
      return;
    }

    queueMicrotask(() => {
      void loadGlobalMessages();
      void loadDmPreviews();
    });

    const globalChannel = supabase
      .channel(`global-messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "thread_type=eq.global",
        },
        (payload) => {
          const row = payload.new as MessageRow;
          setGlobalMessages((prev) => [...prev, mapMessage(row)]);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setWsStatus("open");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setWsStatus("closed");
        }
      });

    const dmChannel = supabase
      .channel(`dm-messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "thread_type=eq.dm",
        },
        (payload) => {
          const row = payload.new as MessageRow;
          const isInbound = row.recipient_id === user.id;
          const isOutbound = row.sender_id === user.id;
          if (!isInbound && !isOutbound) return;

          const otherUserId = isInbound ? row.sender_id : row.recipient_id;
          if (!otherUserId) return;

          const mapped = mapMessage(row);
          setDmMessages((prev) => ({
            ...prev,
            [otherUserId]: [...(prev[otherUserId] ?? []), mapped],
          }));

          setDmPreviews((prev) => {
            const existing = prev.find((p) => p.userId === otherUserId);
            if (!existing) {
              return [
                {
                  id: otherUserId,
                  userId: otherUserId,
                  username: row.sender?.username ?? "user",
                  displayName: row.sender?.display_name ?? row.sender?.username ?? "User",
                  avatarUrl: row.sender?.avatar_url ?? undefined,
                  isOnline: false,
                  lastMessage: row.content,
                  lastActivity: row.created_at,
                  unreadCount:
                    activeDmUserIdRef.current === otherUserId || isOutbound ? 0 : 1,
                },
                ...prev,
              ];
            }

            return prev.map((p) =>
              p.userId === otherUserId
                ? {
                    ...p,
                    lastMessage: row.content,
                    lastActivity: row.created_at,
                    unreadCount:
                      activeDmUserIdRef.current === otherUserId || isOutbound
                        ? 0
                        : p.unreadCount + 1,
                  }
                : p
            );
          });
        }
      )
      .subscribe();

    globalChannelRef.current = globalChannel;
    dmChannelRef.current = dmChannel;

    return () => {
      globalChannel.unsubscribe();
      dmChannel.unsubscribe();
    };
  }, [loadDmPreviews, loadGlobalMessages, session?.access_token, supabase, user]);

  const sendGlobal = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      const res = await fetch("/api/chat/global", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send global message");
    },
    [authHeaders]
  );

  const sendDM = useCallback(
    async (toUserId: string, content: string) => {
      if (!content.trim()) return;
      const res = await fetch(`/api/chat/dms/${toUserId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send DM");
    },
    [authHeaders]
  );

  const openDM = useCallback(
    async (userId: string) => {
      setActiveDmUserId(userId);
      setDmPreviews((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, unreadCount: 0 } : p))
      );
      await loadDmMessages(userId);
    },
    [loadDmMessages]
  );

  return (
    <ChatContext.Provider
      value={{
        globalMessages,
        dmPreviews,
        activeDmUserId,
        dmMessages,
        sendGlobal,
        sendDM,
        openDM,
        wsStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}
