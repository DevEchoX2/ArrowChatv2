"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { Session } from "@supabase/supabase-js";
import { User } from "@/lib/types";
import { getBrowserSupabaseClient } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (partial: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(accessToken: string): Promise<User> {
  const res = await fetch("/api/profile/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch profile");
  }
  const payload = (await res.json()) as { user: User };
  return payload.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabaseClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: Boolean(supabase),
  });
  const accessToken = state.session?.access_token ?? null;

  const hydrateUserFromSession = useCallback(
    async (session: Session | null) => {
      if (!session?.access_token) {
        setState({ user: null, session: null, isLoading: false });
        return;
      }

      setState((prev) => ({ ...prev, session, isLoading: true }));
      try {
        const user = await fetchMe(session.access_token);
        setState({ user, session, isLoading: false });
      } catch {
        setState({ user: null, session, isLoading: false });
      }
    },
    []
  );

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        void hydrateUserFromSession(session);
      })
      .catch(() => {
        if (mounted) setState({ user: null, session: null, isLoading: false });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateUserFromSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateUserFromSession, supabase]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      setState((s) => ({ ...s, isLoading: true }));
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setState((s) => ({ ...s, isLoading: false }));
        throw new Error(error.message);
      }
    },
    [supabase]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      setState((s) => ({ ...s, isLoading: true }));
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setState((s) => ({ ...s, isLoading: false }));
        throw new Error(error.message);
      }
    },
    [supabase]
  );

  const loginWithDiscord = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured");
    setState((s) => ({ ...s, isLoading: true }));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      setState((s) => ({ ...s, isLoading: false }));
      throw new Error(error.message);
    }
  }, [supabase]);

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setState({ user: null, session: null, isLoading: false });
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;
    const user = await fetchMe(accessToken);
    setState((prev) => ({ ...prev, user }));
  }, [accessToken]);

  const updateUser = useCallback(
    async (partial: Partial<User>) => {
      if (!accessToken) throw new Error("No active session");
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ profile: partial }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update profile");
      }

      const payload = (await res.json()) as { user: User };
      setState((prev) => ({ ...prev, user: payload.user }));
    },
    [accessToken]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        loginWithDiscord,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
