"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  theme: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  register: (username: string, password: string, displayName?: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ["/giris", "/kayit"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Redirect logic
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!user && !isPublic) {
      router.replace("/giris");
    } else if (user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error;
      setUser(data.user);
      router.replace("/");
      return null;
    } catch {
      return "Baglanti hatasi";
    }
  };

  const register = async (username: string, password: string, displayName?: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) return data.error;
      setUser(data.user);
      router.replace("/");
      return null;
    } catch {
      return "Baglanti hatasi";
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/giris");
  };

  // Public sayfalardan biri ise ve kullanici yoksa icerik goster
  // Diger sayfalarda kullanici yoksa loading goster
  const isPublic = PUBLIC_PATHS.includes(pathname);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user && !isPublic) {
    return null; // Router will redirect
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
