"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetch } from "./api";

export type UserRole = "admin" | "recruiter" | "candidate";

export type User = {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  provider?: string;
  email_verified?: boolean;
};

type AuthResponse = User & { token: string };

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
};

type AuthActions = {
  login: (email: string, password: string) => Promise<User>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: "recruiter" | "candidate",
  ) => Promise<User>;
  /** Store a JWT obtained out-of-band (e.g. the Google OAuth callback) and load the profile. */
  setSession: (token: string) => Promise<User>;
  /** Persist a self-service role chosen after authentication. */
  setRole: (role: "recruiter" | "candidate") => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isAuthenticated: () => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
};

type AuthStore = AuthState & AuthActions;

function toUser(data: AuthResponse): User {
  return {
    user_id: data.user_id,
    email: data.email,
    name: data.name,
    role: data.role,
    provider: data.provider,
    email_verified: data.email_verified,
  };
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      initialized: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const data = await apiFetch<AuthResponse>("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const user = toUser(data);
          set({ user, token: data.token, loading: false });
          return user;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signup: async (email, password, name, role) => {
        set({ loading: true });
        try {
          const data = await apiFetch<AuthResponse>("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name, role }),
          });
          const user = toUser(data);
          set({ user, token: data.token, loading: false });
          return user;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      setSession: async (token) => {
        set({ token, loading: true });
        try {
          const user = await apiFetch<User>("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ user, token, loading: false, initialized: true });
          return user;
        } catch (error) {
          set({ user: null, token: null, loading: false });
          throw error;
        }
      },

      setRole: async (role) => {
        const { token } = get();
        if (!token) throw new Error("You are not signed in");
        set({ loading: true });
        try {
          const data = await apiFetch<AuthResponse>("/api/auth/role", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ role }),
          });
          const user = toUser(data);
          set({ user, token: data.token, loading: false });
          return user;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiFetch("/api/auth/logout", { method: "POST" });
        } catch {
          // Ignore errors — clear local state regardless
        }
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ initialized: true });
          return;
        }
        try {
          const user = await apiFetch<User>("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ user, initialized: true });
        } catch {
          set({ user: null, token: null, initialized: true });
        }
      },

      isAuthenticated: () => !!get().user && !!get().token,
      hasRole: (...roles: UserRole[]) => {
        const { user } = get();
        return !!user && roles.includes(user.role);
      },
    }),
    {
      name: "aihire-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);

/** Map a role to its primary dashboard route. */
export function dashboardPath(role: UserRole | string): string {
  if (role === "admin") return "/admin";
  if (role === "recruiter") return "/hr";
  return "/candidate";
}
