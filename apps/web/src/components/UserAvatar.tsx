import { User } from "@/lib/types";
import { UserRound } from "lucide-react";

interface Props {
  user?: Pick<User, "displayName" | "avatarUrl" | "tier" | "isOnline">;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}

const SIZE_MAP = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-2xl",
};

const TIER_RING: Record<string, string> = {
  staff: "ring-1 ring-white/80",
  premium: "ring-1 ring-white/40",
  free: "",
};

export function UserAvatar({ user, size = "md", showStatus = false }: Props) {
  const sizeClass = SIZE_MAP[size];
  const ringClass = user ? (TIER_RING[user.tier] ?? "") : "";

  return (
    <div className={`relative shrink-0 ${sizeClass}`}>
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.displayName}
          className={`h-full w-full rounded-full object-cover ${ringClass}`}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 ${ringClass}`}
        >
          <UserRound size={size === "lg" ? 28 : size === "md" ? 16 : 12} />
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-black ${
            user?.isOnline ? "bg-white" : "bg-white/20"
          }`}
        />
      )}
    </div>
  );
}
