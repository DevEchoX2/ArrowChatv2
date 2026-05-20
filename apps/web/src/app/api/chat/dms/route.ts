import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, UnauthorizedError } from "@/lib/serverAuth";
import { DMPreview } from "@/lib/types";

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_online: boolean;
  };
  recipient: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_online: boolean;
  };
}

export async function GET(req: NextRequest) {
  try {
    const { dbClient, user } = await getAuthenticatedClient(req);

    const { data, error } = await dbClient
      .from("messages")
      .select(
        `id, sender_id, recipient_id, content, created_at,
         sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url, is_online),
         recipient:profiles!messages_recipient_id_fkey(id, username, display_name, avatar_url, is_online)`
      )
      .eq("thread_type", "dm")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (data ?? []) as unknown as MessageRow[];
    const previews = new Map<string, DMPreview>();

    for (const row of rows) {
      const isSender = row.sender_id === user.id;
      const isRecipient = row.recipient_id === user.id;
      if (!isSender && !isRecipient) continue;

      const other = isSender ? row.recipient : row.sender;
      if (!other) continue;

      if (!previews.has(other.id)) {
        previews.set(other.id, {
          id: `${user.id}:${other.id}`,
          userId: other.id,
          username: other.username,
          displayName: other.display_name,
          avatarUrl: other.avatar_url ?? undefined,
          isOnline: other.is_online,
          lastMessage: row.content,
          lastActivity: row.created_at,
          unreadCount: 0,
        });
      }
    }

    return NextResponse.json({ conversations: Array.from(previews.values()) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
