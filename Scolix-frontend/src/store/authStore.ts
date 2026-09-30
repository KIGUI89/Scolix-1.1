import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types/auth";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (tokens: { access: string; refresh: string }, user: User) => void;
  setAccessToken: (access: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (tokens, user) =>
        set({ accessToken: tokens.access, refreshToken: tokens.refresh, user }),
      setAccessToken: (access) => set({ accessToken: access }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "scolix-auth" },
  ),
);
