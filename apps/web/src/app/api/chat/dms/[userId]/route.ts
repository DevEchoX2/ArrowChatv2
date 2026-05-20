import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, UnauthorizedError } from "@/lib/serverAuth";
import { ChatMessage } from "@/lib/types";

interface MessageRow {
  id: string;
  sender_id: string;
  content: string;
  tts: boolean;
  created_at: string;
  sender: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    tier: "free" | "premium" | "staff";
  };
}

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherUserId } = await params;
    const { dbClient, user } = await getAuthenticatedClient(req);
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;

    const { data, error } = await dbClient
      .from("messages")
      .select(
        `id, sender_id, recipient_id, content, tts, created_at, sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url, tier)`
      )
      .eq("thread_type", "dm")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ messages: (data ?? []).map((row) => mapMessage(row as unknown as MessageRow)) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: recipientId } = await params;
    const { dbClient, user } = await getAuthenticatedClient(req);
    const body = (await req.json()) as { content?: string; tts?: boolean };
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
    }

    const { error } = await dbClient.from("messages").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      thread_type: "dm",
      content,
      tts: Boolean(body.tts),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
