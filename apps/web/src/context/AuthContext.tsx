"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { User } from "@/lib/types";
import { MOCK_CURRENT_USER } from "@/lib/mockData";

// ─── Context shape ───────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // Pre-seed with mock user for UI development; replace with real auth later.
  const [state, setState] = useState<AuthState>({
    user: MOCK_CURRENT_USER,
    isLoading: false,
  });

  const login = useCallback(async (username: string, _password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      // TODO: replace with real API call – POST /api/auth/login
      await new Promise((r) => setTimeout(r, 400));
      setState({
        user: { ...MOCK_CURRENT_USER, username, displayName: username },
        isLoading: false,
      });
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
      throw new Error("Login failed");
    }
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, isLoading: false });
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setState((s) =>
      s.user ? { ...s, user: { ...s.user, ...partial } } : s
    );
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
