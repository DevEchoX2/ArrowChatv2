"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Mail,
  Settings,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { UserAvatar } from "./UserAvatar";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageSquare, label: "Global Chat" },
  { href: "/dm", icon: Mail, label: "Direct Messages" },
  { href: "/dashboard", icon: User, label: "My Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { wsStatus } = useChat();

  return (
    <aside className="flex h-screen w-16 flex-col items-center border-r border-white/10 bg-black py-4 md:w-56 md:items-start md:px-3">
      {/* Brand */}
      <div className="mb-6 flex w-full items-center gap-2 px-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/5 text-xs font-bold text-white">
          AC
        </div>
        <span className="hidden text-sm font-semibold tracking-widest text-white/90 md:block">
          ARROWCHAT
        </span>
      </div>

      {/* Nav */}
      <nav className="flex w-full flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: user chip + WS indicator */}
      <div className="flex w-full items-center gap-2 border-t border-white/10 pt-3">
        <UserAvatar user={user ?? undefined} size="sm" />
        <div className="hidden flex-1 overflow-hidden md:block">
          <p className="truncate text-xs font-medium text-white/80">
            {user?.displayName ?? "Guest"}
          </p>
          <p className="truncate text-[10px] text-white/30">
            @{user?.username ?? "—"}
          </p>
        </div>
        <span
          title={`WebSocket: ${wsStatus}`}
          className="hidden shrink-0 md:block"
        >
          {wsStatus === "open" ? (
            <Wifi size={13} className="text-white/60" />
          ) : (
            <WifiOff size={13} className="text-white/20" />
          )}
        </span>
      </div>
    </aside>
  );
}
