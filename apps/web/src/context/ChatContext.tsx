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
import { ChatMessage, DMPreview } from "@/lib/types";
import { MOCK_GLOBAL_MESSAGES, MOCK_DM_PREVIEWS } from "@/lib/mockData";
import { useAuth } from "./AuthContext";

// ─── Context shape ───────────────────────────────────────────────────────────

interface ChatContextValue {
  globalMessages: ChatMessage[];
  dmPreviews: DMPreview[];
  activeDmUserId: string | null;
  dmMessages: Record<string, ChatMessage[]>;
  sendGlobal: (content: string) => void;
  sendDM: (toUserId: string, content: string) => void;
  openDM: (userId: string) => void;
  wsStatus: "connecting" | "open" | "closed";
}

const ChatContext = createContext<ChatContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>(
    MOCK_GLOBAL_MESSAGES
  );
  const [dmPreviews, setDmPreviews] = useState<DMPreview[]>(MOCK_DM_PREVIEWS);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<Record<string, ChatMessage[]>>(
    {}
  );
  const [wsStatus, setWsStatus] = useState<"connecting" | "open" | "closed">(
    "closed"
  );

  const wsRef = useRef<WebSocket | null>(null);

  // ── WebSocket connection ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ??
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

    setWsStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("open");
    ws.onclose = () => setWsStatus("closed");
    ws.onerror = () => setWsStatus("closed");

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as {
          type: "global" | "dm";
          message: ChatMessage;
          toUserId?: string;
        };

        if (payload.type === "global") {
          setGlobalMessages((prev) => [...prev, payload.message]);
        } else if (payload.type === "dm" && payload.toUserId) {
          const key = payload.toUserId;
          setDmMessages((prev) => ({
            ...prev,
            [key]: [...(prev[key] ?? []), payload.message],
          }));
          setDmPreviews((prev) =>
            prev.map((p) =>
              p.userId === key
                ? {
                    ...p,
                    lastMessage: payload.message.content,
                    lastActivity: payload.message.timestamp,
                    unreadCount:
                      activeDmUserId === key ? 0 : p.unreadCount + 1,
                  }
                : p
            )
          );
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send helpers ────────────────────────────────────────────────────────
  const buildMessage = useCallback(
    (content: string): ChatMessage => ({
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      authorId: user?.id ?? "anon",
      authorName: user?.displayName ?? "Anonymous",
      authorAvatar: user?.avatarUrl,
      authorTier: user?.tier ?? "free",
      content,
      timestamp: new Date().toISOString(),
    }),
    [user]
  );

  const sendGlobal = useCallback(
    (content: string) => {
      if (!content.trim()) return;
      const msg = buildMessage(content);

      // Optimistic update
      setGlobalMessages((prev) => [...prev, msg]);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "global", message: msg })
        );
      }
    },
    [buildMessage]
  );

  const sendDM = useCallback(
    (toUserId: string, content: string) => {
      if (!content.trim()) return;
      const msg = buildMessage(content);

      setDmMessages((prev) => ({
        ...prev,
        [toUserId]: [...(prev[toUserId] ?? []), msg],
      }));

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "dm", message: msg, toUserId })
        );
      }
    },
    [buildMessage]
  );

  const openDM = useCallback((userId: string) => {
    setActiveDmUserId(userId);
    // Clear unread when conversation is opened
    setDmPreviews((prev) =>
      prev.map((p) =>
        p.userId === userId ? { ...p, unreadCount: 0 } : p
      )
    );
  }, []);

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}
