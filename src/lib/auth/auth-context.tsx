"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  two_factor_enabled?: boolean;
}

export interface AdminRole {
  id: string;
  is_superadmin: boolean;
  permissions: string[];
}

export interface AuthContextType {
  user: User | null;
  admin: AdminRole | null;
  isLoading: boolean;
  login: (credentials: { identifier: string; password: string }) => Promise<{
    success: boolean;
    twoFactorRequired?: boolean;
    tempToken?: string;
    error?: string;
  }>;
  verify2FA: (data: {
    tempToken: string;
    code: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setAdmin(data.admin || null);
      } else {
        setUser(null);
        setAdmin(null);
      }
    } catch {
      setUser(null);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (credentials: {
    identifier: string;
    password: string;
  }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      if (data.two_factor_required) {
        return {
          success: true,
          twoFactorRequired: true,
          tempToken: data.temp_token,
        };
      }

      setUser(data.user);
      setAdmin(data.admin);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const verify2FA = async (data: { tempToken: string; code: string }) => {
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Verification failed",
        };
      }

      setUser(resData.user);
      setAdmin(resData.admin);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setAdmin(null);
      router.push("/login");
    }
  };

  const hasPermission = (perm: string): boolean => {
    if (!admin) return false;
    if (admin.is_superadmin) return true;
    return admin.permissions.includes("*") || admin.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        isLoading,
        login,
        verify2FA,
        logout,
        refresh,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
