import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, UnauthorizedError } from "@/lib/serverAuth";
import { User } from "@/lib/types";

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  tier: "free" | "premium" | "staff";
  badges: User["badges"] | null;
  social_links: User["socialLinks"] | null;
  profile_theme: User["profileTheme"] | null;
  created_at: string;
  is_online: boolean;
}

function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    tier: row.tier,
    badges: row.badges ?? [],
    socialLinks: row.social_links ?? [],
    profileTheme: row.profile_theme ?? {
      backgroundType: "solid",
      backgroundColor: "#000000",
      accentColor: "#ffffff",
    },
    createdAt: row.created_at,
    isOnline: row.is_online,
  };
}

async function ensureProfileExists(userId: string, email: string | undefined, dbClient: Awaited<ReturnType<typeof getAuthenticatedClient>>["dbClient"]) {
  const username =
    (email?.split("@")[0] ?? `user_${userId.slice(0, 8)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 16) || `user_${userId.slice(0, 8)}`;
  const safeUsername = `${username}_${userId.slice(0, 6)}`.slice(0, 24);

  const { error } = await dbClient.from("profiles").upsert(
    {
      id: userId,
      username: safeUsername,
      display_name: safeUsername,
      tier: "free",
      badges: [],
      social_links: [],
      profile_theme: {
        backgroundType: "solid",
        backgroundColor: "#000000",
        accentColor: "#ffffff",
      },
      is_online: true,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (error) throw new Error(error.message);
}

export async function GET(req: NextRequest) {
  try {
    const { dbClient, user } = await getAuthenticatedClient(req);
    await ensureProfileExists(user.id, user.email, dbClient);

    const { data, error } = await dbClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ user: mapProfile(data as ProfileRow) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { dbClient, user } = await getAuthenticatedClient(req);
    const body = (await req.json()) as { profile?: Partial<User> };
    const profile = body.profile;

    if (!profile) {
      return NextResponse.json({ error: "Missing profile payload" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof profile.displayName === "string") updates.display_name = profile.displayName;
    if (typeof profile.avatarUrl === "string" || profile.avatarUrl === undefined) {
      updates.avatar_url = profile.avatarUrl ?? null;
    }
    if (typeof profile.bio === "string" || profile.bio === undefined) updates.bio = profile.bio ?? null;
    if (Array.isArray(profile.socialLinks)) updates.social_links = profile.socialLinks;
    if (Array.isArray(profile.badges)) updates.badges = profile.badges;
    if (profile.profileTheme) updates.profile_theme = profile.profileTheme;
    if (typeof profile.isOnline === "boolean") updates.is_online = profile.isOnline;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const { data, error } = await dbClient
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to update" }, { status: 400 });
    }

    return NextResponse.json({ user: mapProfile(data as ProfileRow) });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
