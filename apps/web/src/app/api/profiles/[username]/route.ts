import { NextResponse } from "next/server";
import { User } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: mapProfile(data as ProfileRow) });
}
