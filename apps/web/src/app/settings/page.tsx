"use client";

import { useAuth } from "@/context/AuthContext";
import { LogOut, Settings } from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Settings size={18} className="text-white/50" />
        <h1 className="text-lg font-bold text-white">Settings</h1>
      </div>

      <div className="max-w-md space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-1 text-xs text-white/40">Signed in as</p>
          <p className="text-sm font-semibold text-white/80">
            {user?.displayName}
          </p>
          <p className="text-xs text-white/30">@{user?.username}</p>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 transition hover:border-white/20 hover:text-white/90"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}
