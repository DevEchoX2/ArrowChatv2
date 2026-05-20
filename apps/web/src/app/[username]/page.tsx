import { notFound } from "next/navigation";
import { BioProfile } from "@/components/BioProfile";
import { createServerSupabaseClient } from "@/lib/supabase";
import { User } from "@/lib/types";

interface Props {
  params: Promise<{ username: string }>;
}

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

async function getProfileByUsername(username: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const user = await getProfileByUsername(username);
  if (!user) return { title: "User not found" };
  return {
    title: `${user.displayName} (@${user.username}) · ArrowChat`,
    description: user.bio ?? "",
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const user = await getProfileByUsername(username);
  if (!user) notFound();

  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-12">
      <div className="w-full max-w-sm">
        <BioProfile user={user} />
      </div>
    </div>
  );
}
