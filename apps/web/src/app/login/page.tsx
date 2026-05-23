"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, loginWithDiscord, isLoading, user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [router, user]);

  if (user) return null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h1 className="text-lg font-semibold text-white">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-xs text-white/40">Supabase authentication</p>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              setError(null);
              try {
                await loginWithDiscord();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Discord sign-in failed");
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-white/20 bg-[#5865F2]/20 px-3 py-2 text-sm text-white/90 transition hover:bg-[#5865F2]/30 disabled:opacity-40"
          >
            <MessageSquare size={16} />
            Continue with Discord
          </button>

          <div className="flex items-center gap-3 text-[10px] text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            <span>or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white/80 outline-none focus:border-white/40"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white/80 outline-none focus:border-white/40"
          />
        </div>

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

        <button
          disabled={isLoading}
          className="mt-4 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/20 disabled:opacity-40"
          type="submit"
        >
          {isLoading ? "Please wait..." : mode === "login" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
          className="mt-2 w-full text-xs text-white/40 hover:text-white/70"
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
