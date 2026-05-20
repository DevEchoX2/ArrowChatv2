import Link from "next/link";
import { MessageSquare, Mail, User, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          ArrowChat
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Bio links · Global chat · Direct messages
        </p>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <Link
          href="/chat"
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          <MessageSquare size={22} strokeWidth={1.5} />
          Global Chat
        </Link>
        <Link
          href="/dm"
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          <Mail size={22} strokeWidth={1.5} />
          Messages
        </Link>
        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          <User size={22} strokeWidth={1.5} />
          My Profile
        </Link>
        <Link
          href="/dashboard?tab=premium"
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          <Zap size={22} strokeWidth={1.5} />
          Go Premium
        </Link>
      </div>

      <p className="text-xs text-white/20">
        Running on Next.js · Caddy · VPS
      </p>
    </div>
  );
}
